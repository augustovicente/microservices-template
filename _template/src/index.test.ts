import request from 'supertest';
import { createApp } from './app';

jest.mock('@microservices-template/shared', () => {
  const actual = jest.requireActual('@microservices-template/shared');
  return {
    ...actual,
    loadConfig: () => ({
      service: { name: 'test-service', port: 3000, logLevel: 'error' },
      database: { type: 'none' },
      features: { prometheus: false, auth: false, cors: true, healthCheck: false },
      cors: { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    }),
  };
});

describe('{{SERVICE_NAME}}-service', () => {
  const { app } = createApp();

  it('responds to ping', async () => {
    const response = await request(app).get('/ping');
    expect(response.status).toBe(200);
    expect(response.text).toBe('pong');
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
  });
});
