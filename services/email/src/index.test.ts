import request from 'supertest';
import { createApp } from './app';

jest.mock('@microservices-template/shared', () => {
  const actual = jest.requireActual('@microservices-template/shared');
  return {
    ...actual,
    loadConfig: () => ({
      service: { name: 'email-test', port: 3000, logLevel: 'error' },
      database: { type: 'none' },
      features: { prometheus: false, auth: false, cors: true, healthCheck: false },
      cors: { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      // messaging disabled in tests
    }),
  };
});

const mockSender = { send: jest.fn().mockResolvedValue(undefined) };

describe('email-service', () => {
  const { app } = createApp({ sender: mockSender });

  afterEach(() => jest.clearAllMocks());

  it('GET /ping — returns pong', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });

  it('POST /email/send — sends email', async () => {
    const res = await request(app).post('/email/send').send({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'World',
    });
    expect(res.status).toBe(200);
    expect(mockSender.send).toHaveBeenCalledTimes(1);
  });

  it('POST /email/send — 400 for missing fields', async () => {
    const res = await request(app).post('/email/send').send({ to: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
  });
});
