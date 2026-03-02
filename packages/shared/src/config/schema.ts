import { z } from 'zod';

export const serviceConfigSchema = z.object({
  service: z.object({
    name: z.string(),
    port: z.number().default(3000),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),

  database: z.object({
    type: z.enum(['mysql', 'postgres', 'none']).default('none'),
    host: z.string().optional(),
    port: z.number().optional(),
    name: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    poolSize: z.number().default(10),
    migrationsDir: z.string().optional(),
  }).default({ type: 'none' }),

  features: z.object({
    prometheus: z.boolean().default(true),
    auth: z.boolean().default(false),
    rateLimit: z.number().optional(),
    cors: z.boolean().default(true),
    healthCheck: z.boolean().default(true),
  }).default({}),

  cors: z.object({
    origins: z.array(z.string()).default(['*']),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  }).default({}),

  messaging: z.object({
    enabled: z.boolean().default(false),
    nsqdHost: z.string().default('nsqd'),
    nsqdHttpPort: z.number().default(4151),
    nsqLookupdHost: z.string().default('nsqlookupd'),
    nsqLookupdHttpPort: z.number().default(4161),
  }).optional(),
});

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
