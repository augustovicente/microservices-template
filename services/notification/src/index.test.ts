import request from 'supertest';
import { createApp } from './app';
import type { DatabaseClient } from '@microservices-template/shared';

jest.mock('@microservices-template/shared', () => {
  const actual = jest.requireActual('@microservices-template/shared');
  return {
    ...actual,
    loadConfig: () => ({
      service: { name: 'notification-test', port: 3000, logLevel: 'error' },
      database: { type: 'mysql', host: 'localhost', port: 3306, name: 'notification', poolSize: 10 },
      features: { prometheus: false, auth: false, cors: true, healthCheck: false },
      cors: { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    }),
    createDatabaseClient: () => null,
  };
});

const mockDb: DatabaseClient = {
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue({}),
  close: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPool: jest.fn() as any,
};

describe('notification-service', () => {
  const { app } = createApp({ db: mockDb });

  it('GET /ping — returns pong', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });

  it('GET /notifications — 400 without userId', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(400);
  });

  it('GET /notifications?userId=1 — returns list', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce([]);
    const res = await request(app).get('/notifications?userId=1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('PATCH /notifications/:id/read — marks as read', async () => {
    const res = await request(app).patch('/notifications/1/read');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Marked as read');
  });

  it('POST /notifications/:userId/read-all — marks all as read', async () => {
    const res = await request(app).post('/notifications/1/read-all');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All marked as read');
  });
});
