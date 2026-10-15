import { AwsClient } from 'aws4fetch';

/** Storage por su protocolo S3: las claves solo alcanzan archivos, nunca la base (ADR 0017). */
export interface StorageConfig {
  s3Url: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Base de los enlaces públicos: `<proyecto>/storage/v1/object/public`. */
  publicUrl: string;
}

/** Bucket público (ADR 0017): solo la API escribe; quien tiene el enlace lee. */
const BUCKET = 'public-files';

export interface PublicFiles {
  /** Sube un archivo nuevo en `path` y devuelve su enlace público permanente. */
  put(path: string, body: Uint8Array, contentType: string): Promise<string>;
}

export function publicFiles(config: StorageConfig): PublicFiles {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    service: 's3',
  });
  return {
    async put(path, body, contentType) {
      const response = await client.fetch(`${config.s3Url}/${BUCKET}/${path}`, {
        method: 'PUT',
        body,
        headers: { 'content-type': contentType },
      });
      if (!response.ok) throw new Error(`Storage respondió ${response.status} al subir ${path}`);
      return `${config.publicUrl}/${BUCKET}/${path}`;
    },
  };
}
