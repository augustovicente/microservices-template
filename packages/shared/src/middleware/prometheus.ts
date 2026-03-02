import { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

interface PrometheusMiddlewareOptions {
  serviceName: string;
  defaultMetrics?: boolean;
}

export function createPrometheusMiddleware(options: PrometheusMiddlewareOptions) {
  const { serviceName, defaultMetrics = true } = options;
  const registry = new Registry();

  if (defaultMetrics) {
    collectDefaultMetrics({ register: registry });
  }

  const requestCount = new Counter({
    name: `${serviceName}_http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [registry],
  });

  const requestDuration = new Histogram({
    name: `${serviceName}_http_request_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry],
  });

  function middleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const labels = {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode.toString(),
      };

      requestCount.inc(labels);
      requestDuration.observe(labels, duration);
    });

    next();
  }

  return { middleware, registry };
}
