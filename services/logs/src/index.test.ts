import request from 'supertest';
import { createApp } from './app';
import type { DatabaseClient } from '@microservices-template/shared';

jest.mock('@microservices-template/shared', () => {
  const actual = jest.requireActual('@microservices-template/shared');
  return {
    ...actual,
    loadConfig: () => ({
      service: { name: 'logs-test', port: 3000, logLevel: 'error' },
      database: { type: 'mysql', host: 'localhost', port: 3306, name: 'logs', poolSize: 10 },
      features: { prometheus: false, auth: false, cors: true, healthCheck: false },
      cors: { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    }),
    createDatabaseClient: () => null, // overridden via createApp()
  };
});

const mockDb: DatabaseClient = {
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue({ insertId: 1 }),
  close: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPool: jest.fn() as any,
};

describe('logs-service', () => {
  const { app } = createApp({ db: mockDb });

  it('returns 201 for a successful log save', async () => {
    const response = await request(app).post('/logs').send({
      user_id: 1,
      application_name: 'OPA',
      message: 'OPA',
      label: 'OPA',
      code: '500',
      metadata: 'OPAAA',
    });

    expect(response.status).toBe(201);
  });

  it('returns 404 for an unknown endpoint', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/logs').send({
      user_id: 1,
      application_name: 'OPA',
      message: 'OPA',
      label: 'OPA',
      code: '500',
    });

    expect(response.status).toBe(400);
  });
});