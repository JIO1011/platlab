import { errorResponse, type ErrorCode } from '@platlab/contracts';
import type { z } from 'zod';
import { env } from './env';
import { supabase } from './supabase';

/** Error de la API con su código estable; la interfaz decide el estado a mostrar por el código. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK',
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (error: unknown, ...codes: Array<ApiError['code']>): error is ApiError =>
  error instanceof ApiError && (codes.length === 0 || codes.includes(error.code));

interface Request<S extends z.ZodType> {
  schema: S;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
  /** Un archivo (ficha de seguridad en PDF, ADR 0017; foto de equipo, ADR 0019): va tal cual, en lugar de `body`. */
  file?: { body: Blob; type: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' };
  /** Misma clave en los reintentos de un mismo envío: el servidor no repite el efecto (02 §7). */
  idempotencyKey?: string;
}

/** Envía la petición con la sesión y traduce un rechazo a `ApiError`; devuelve la respuesta aceptada. */
async function send(path: string, request: Omit<Request<z.ZodType>, 'schema'>): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'IDENTITY_INVALID', 'Tu sesión terminó. Vuelve a iniciar sesión.');

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/v1${path}`, {
      method: request.method ?? 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(request.file ? { 'content-type': request.file.type } : {}),
        ...(request.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(request.idempotencyKey ? { 'idempotency-key': request.idempotencyKey } : {}),
      },
      ...(request.file ? { body: request.file.body } : {}),
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No hay conexión con PlatLab. Revisa tu red y vuelve a intentarlo.');
  }

  if (!response.ok) {
    const parsed = errorResponse.safeParse(await response.json().catch(() => null));
    throw parsed.success
      ? new ApiError(response.status, parsed.data.error.code, parsed.data.error.message)
      : new ApiError(response.status, 'INTERNAL', 'PlatLab no pudo completar la acción.');
  }
  return response;
}

export async function api<S extends z.ZodType>(path: string, request: Request<S>): Promise<z.infer<S>> {
  const response = await send(path, request);
  return request.schema.parse(await response.json().catch(() => null));
}

/** Una descarga (el Excel del Informe, ADR 0019): el archivo y el nombre que le da el servidor. */
export async function apiDownload(path: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await send(path, {});
  const fileName = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'descarga';
  return { blob: await response.blob(), fileName };
}
