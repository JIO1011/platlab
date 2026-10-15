import type { StorageConfig } from './platform/storage/public-files.js';

/** Configuración de la API desde el entorno. Los valores por defecto solo sirven en local. */
export interface ApiConfig {
  port: number;
  host: string;
  databaseUrl: string;
  auth: { jwksUrl: string; issuer: string; audience: string };
  storage: StorageConfig;
}

// Supabase local (`pnpm db:start`). La credencial es la de desarrollo de supabase/seed.sql.
const localDefaults = {
  DATABASE_URL_API: 'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  AUTH_JWKS_URL: 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json',
  AUTH_ISSUER: 'http://127.0.0.1:54321/auth/v1',
  AUTH_AUDIENCE: 'authenticated',
  // Storage local con las claves S3 fijas de la CLI de Supabase (`supabase status`), que solo alcanzan
  // archivos (ADR 0017).
  STORAGE_S3_URL: 'http://127.0.0.1:54321/storage/v1/s3',
  STORAGE_S3_REGION: 'local',
  STORAGE_S3_ACCESS_KEY_ID: '625729a08b95bf1b7ff351a663f3a23c',
  STORAGE_S3_SECRET_ACCESS_KEY: '850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907',
  STORAGE_PUBLIC_URL: 'http://127.0.0.1:54321/storage/v1/object/public',
} as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const production = env['NODE_ENV'] === 'production';
  const read = (name: keyof typeof localDefaults): string => {
    const value = env[name];
    if (value) return value;
    // Fuera de local, una variable ausente es un error: nunca se cae a la base o al emisor locales.
    if (production) throw new Error(`Falta la variable de entorno ${name}`);
    return localDefaults[name];
  };
  return {
    port: Number(env['PORT'] ?? 3000),
    host: env['HOST'] ?? '127.0.0.1',
    databaseUrl: read('DATABASE_URL_API'),
    auth: {
      jwksUrl: read('AUTH_JWKS_URL'),
      issuer: read('AUTH_ISSUER'),
      audience: read('AUTH_AUDIENCE'),
    },
    storage: {
      s3Url: read('STORAGE_S3_URL'),
      region: read('STORAGE_S3_REGION'),
      accessKeyId: read('STORAGE_S3_ACCESS_KEY_ID'),
      secretAccessKey: read('STORAGE_S3_SECRET_ACCESS_KEY'),
      publicUrl: read('STORAGE_PUBLIC_URL'),
    },
  };
}
