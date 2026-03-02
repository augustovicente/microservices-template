import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

export interface AuthConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  roles: string[];
  defaultRole: string;
}

let cached: AuthConfig | null = null;

export function loadAuthConfig(basePath?: string): AuthConfig {
  if (cached) return cached;

  const configPath = resolve(basePath || process.cwd(), 'service.config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;

  cached = {
    jwt: {
      accessTokenSecret: env('JWT_ACCESS_SECRET', (parsed.jwt as Record<string, string>)?.accessTokenSecret || 'change-me'),
      refreshTokenSecret: env('JWT_REFRESH_SECRET', (parsed.jwt as Record<string, string>)?.refreshTokenSecret || 'change-me'),
      accessTokenExpiry: (parsed.jwt as Record<string, string>)?.accessTokenExpiry || '15m',
      refreshTokenExpiry: (parsed.jwt as Record<string, string>)?.refreshTokenExpiry || '7d',
    },
    roles: (parsed.roles as string[]) || ['admin', 'user'],
    defaultRole: (parsed.defaultRole as string) || 'user',
  };

  return cached;
}

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}
