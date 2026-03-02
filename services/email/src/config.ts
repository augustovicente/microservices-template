import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

interface SendgridConfig {
  apiKey: string;
}

interface TemplateConfig {
  subject: string;
  body: string;
}

export interface EmailServiceConfig {
  provider: 'smtp' | 'sendgrid';
  from: string;
  fromName: string;
  smtp?: SmtpConfig;
  sendgrid?: SendgridConfig;
  templates: Record<string, TemplateConfig>;
}

let cached: EmailServiceConfig | null = null;

export function loadEmailConfig(basePath?: string): EmailServiceConfig {
  if (cached) return cached;

  const configPath = resolve(basePath || process.cwd(), 'service.config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;
  const email = parsed.email as Record<string, unknown>;

  cached = {
    provider: (email?.provider as string as 'smtp' | 'sendgrid') || 'smtp',
    from: (email?.from as string) || 'noreply@example.com',
    fromName: (email?.fromName as string) || 'App',
    smtp: email?.smtp as SmtpConfig | undefined,
    sendgrid: email?.sendgrid as SendgridConfig | undefined,
    templates: (email?.templates as Record<string, TemplateConfig>) || {},
  };

  return cached;
}

/**
 * Simple mustache-style template renderer: {{varName}} → value
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}
