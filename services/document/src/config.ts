import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

export interface DocumentServiceConfig {
  storage: {
    provider: 'local' | 's3';
    local?: { uploadDir: string };
    s3?: { bucket: string; region: string; accessKeyId: string; secretAccessKey: string };
  };
  upload: {
    maxSizeMb: number;
    allowedMimeTypes: string[];
  };
}

let cached: DocumentServiceConfig | null = null;

export function loadDocumentConfig(basePath?: string): DocumentServiceConfig {
  if (cached) return cached;

  const configPath = resolve(basePath || process.cwd(), 'service.config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;

  const storage = parsed.storage as Record<string, unknown> || {};
  const upload = parsed.upload as Record<string, unknown> || {};

  cached = {
    storage: {
      provider: (storage.provider as 'local' | 's3') || 'local',
      local: storage.local as DocumentServiceConfig['storage']['local'],
      s3: storage.s3 as DocumentServiceConfig['storage']['s3'],
    },
    upload: {
      maxSizeMb: (upload.maxSizeMb as number) || 50,
      allowedMimeTypes: (upload.allowedMimeTypes as string[]) || [],
    },
  };

  return cached;
}
