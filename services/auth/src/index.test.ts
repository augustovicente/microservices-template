import request from 'supertest';
import { createApp } from './app';
import type { DatabaseClient } from '@microservices-template/shared';
import bcrypt from 'bcryptjs';

jest.mock('@microservices-template/shared', () => {
  const actual = jest.requireActual('@microservices-template/shared');
  return {
    ...actual,
    loadConfig: () => ({
      service: { name: 'auth-test', port: 3000, logLevel: 'error' },
      database: { type: 'mysql', host: 'localhost', port: 3306, name: 'auth', poolSize: 10 },
      features: { prometheus: false, auth: false, cors: true, healthCheck: false },
      cors: { origins: ['*'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    }),
    createDatabaseClient: () => null,
  };
});

const passwordHash = bcrypt.hashSync('password123', 10);

const mockDb: DatabaseClient = {
  query: jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('SELECT') && sql.includes('users')) {
      return Promise.resolve([{ id: 1, email: 'test@test.com', password_hash: passwordHash, role: 'user', name: 'Test', created_at: '2026-01-01' }]);
    }
    return Promise.resolve([]);
  }),
  execute: jest.fn().mockResolvedValue({ insertId: 1 }),
  close: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPool: jest.fn() as any,
};

describe('auth-service', () => {
  const { app } = createApp({ db: mockDb });

  afterEach(() => jest.clearAllMocks());

  it('POST /auth/register — returns 201', async () => {
    // For register, email check should return empty
    (mockDb.query as jest.Mock).mockResolvedValueOnce([]);

    const res = await request(app).post('/auth/register').send({
      email: 'new@test.com',
      name: 'New User',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('POST /auth/register — returns 400 for missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login — returns 200 with tokens', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('POST /auth/login — returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'wrong',
    });

    expect(res.status).toBe(401);
  });

  it('POST /auth/forgot-password — always returns 200', async () => {
    const res = await request(app).post('/auth/forgot-password').send({
      email: 'test@test.com',
    });

    expect(res.status).toBe(200);
  });

  it('GET /auth/me — returns 401 without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /ping — returns pong', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.text).toBe('pong');
  });
});
