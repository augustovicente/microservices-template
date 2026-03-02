import request from 'supertest';
import { createApp } from './app';
import type { DatabaseClient } from '@microservices-template/shared';

jest.mock('@microservices-template/shared', () => {
  const actual = jest.requireActual('@microservices-template/shared');
  return {
    ...actual,
    loadConfig: () => ({
      service: { name: 'document-test', port: 3000, logLevel: 'error' },
      database: { type: 'mysql', host: 'localhost', port: 3306, name: 'document', poolSize: 10 },
      features: { prometheus: false, auth: false, cors: true, healthCheck: false },
      cors: { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    }),
    createDatabaseClient: () => null,
  };
});

const mockDb: DatabaseClient = {
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue({ insertId: 1 }),
  close: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPool: jest.fn() as any,
};

describe('document-service', () => {
  const { app } = createApp({ db: mockDb });

  it('GET /ping — returns pong', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });

  it('POST /documents/upload — 400 without file', async () => {
    const res = await request(app).post('/documents/upload');
    expect(res.status).toBe(400);
  });

  it('GET /documents — returns list', async () => {
    const res = await request(app).get('/documents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /documents/:id/download — 404 for missing doc', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce([]);
    const res = await request(app).get('/documents/999/download');
    expect(res.status).toBe(404);
  });

  it('DELETE /documents/:id — 404 for missing doc', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce([]);
    const res = await request(app).delete('/documents/999');
    expect(res.status).toBe(404);
  });
});
