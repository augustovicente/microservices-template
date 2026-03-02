import { Logger } from '../logger';
import { ServiceConfig } from '../config/schema';
import { EventEnvelope, TopicName } from './events';
import { randomUUID } from 'crypto';

type MessageHandler<T = unknown> = (event: EventEnvelope<T>) => Promise<void>;

/**
 * Lightweight NSQ publisher.
 * Uses the nsqd HTTP API so we avoid native TCP dependencies.
 */
export class NsqPublisher {
  private baseUrl: string;

  constructor(
    private config: ServiceConfig,
    private logger: Logger,
  ) {
    const host = config.messaging?.nsqdHost || 'nsqd';
    const port = config.messaging?.nsqdHttpPort || 4151;
    this.baseUrl = `http://${host}:${port}`;
  }

  async publish<T>(topic: TopicName, data: T): Promise<void> {
    const envelope: EventEnvelope<T> = {
      id: randomUUID(),
      topic,
      timestamp: new Date().toISOString(),
      source: this.config.service.name,
      data,
    };

    const url = `${this.baseUrl}/pub?topic=${encodeURIComponent(topic)}`;
    const body = JSON.stringify(envelope);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`NSQ publish failed (${res.status}): ${text}`);
      }

      this.logger.debug({ topic, eventId: envelope.id }, 'Event published');
    } catch (err) {
      this.logger.error({ err, topic }, 'Failed to publish event');
      throw err;
    }
  }
}

/**
 * Lightweight NSQ subscriber.
 * Uses the nsqd HTTP long-polling approach (no native TCP dep).
 * In production you'd use nsqjs or a TCP reader — this keeps deps minimal.
 */
export class NsqSubscriber {
  private lookupdUrl: string;
  private running = false;
  private handlers = new Map<string, MessageHandler[]>();
  private abortController: AbortController | null = null;

  constructor(
    private config: ServiceConfig,
    private logger: Logger,
  ) {
    const host = config.messaging?.nsqLookupdHost || 'nsqlookupd';
    const port = config.messaging?.nsqLookupdHttpPort || 4161;
    this.lookupdUrl = `http://${host}:${port}`;
  }

  /**
   * Register a handler for a topic.
   * Multiple handlers per topic are supported (fan-out within the service).
   */
  on<T = unknown>(topic: TopicName, handler: MessageHandler<T>): void {
    const existing = this.handlers.get(topic) || [];
    existing.push(handler as MessageHandler);
    this.handlers.set(topic, existing);
  }

  /**
   * Start consuming. Creates one channel per service per topic.
   * Uses nsqd HTTP /sub style long-poll via the /mpub + /channel/create and
   * a simple polling loop against the nsqd HTTP API.
   */
  async start(): Promise<void> {
    this.running = true;
    this.abortController = new AbortController();
    const channel = this.config.service.name;

    for (const [topic] of this.handlers) {
      this.pollTopic(topic, channel);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.abortController?.abort();
  }

  private async pollTopic(topic: string, channel: string): Promise<void> {
    const nsqdHost = this.config.messaging?.nsqdHost || 'nsqd';
    const nsqdPort = this.config.messaging?.nsqdHttpPort || 4151;
    const baseUrl = `http://${nsqdHost}:${nsqdPort}`;

    // Create the channel if it doesn't exist
    try {
      await fetch(`${baseUrl}/channel/create?topic=${encodeURIComponent(topic)}&channel=${encodeURIComponent(channel)}`, { method: 'POST' });
    } catch {
      // nsqd might not be ready yet, will retry in the loop
    }

    while (this.running) {
      try {
        // Discover nsqd nodes from lookupd
        const lookupRes = await fetch(
          `${this.lookupdUrl}/lookup?topic=${encodeURIComponent(topic)}`,
          { signal: this.abortController?.signal },
        );

        if (!lookupRes.ok) {
          await this.sleep(2000);
          continue;
        }

        const lookupData = (await lookupRes.json()) as {
          producers?: Array<{ broadcast_address: string; http_port: number }>;
        };

        if (!lookupData.producers || lookupData.producers.length === 0) {
          await this.sleep(2000);
          continue;
        }

        // Pull messages from each producer
        for (const producer of lookupData.producers) {
          const nodeUrl = `http://${producer.broadcast_address}:${producer.http_port}`;
          await this.consumeFromNode(nodeUrl, topic, channel);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        this.logger.warn({ err, topic }, 'NSQ poll error, retrying…');
      }

      await this.sleep(1000);
    }
  }

  private async consumeFromNode(nodeUrl: string, topic: string, channel: string): Promise<void> {
    // Pop a message via HTTP
    const url = `${nodeUrl}/pop?topic=${encodeURIComponent(topic)}&channel=${encodeURIComponent(channel)}`;
    const res = await fetch(url, { signal: this.abortController?.signal });

    // 404 or empty means no messages
    if (res.status === 404 || res.status === 204) return;

    // nsqd HTTP /pop is not available in all versions — fall back gracefully
    if (!res.ok) return;

    const text = await res.text();
    if (!text || text === 'null') return;

    try {
      const envelope = JSON.parse(text) as EventEnvelope;
      const handlers = this.handlers.get(topic) || [];

      for (const handler of handlers) {
        try {
          await handler(envelope);
        } catch (err) {
          this.logger.error({ err, topic, eventId: envelope.id }, 'Event handler failed');
        }
      }
    } catch (err) {
      this.logger.error({ err, topic }, 'Failed to parse NSQ message');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
