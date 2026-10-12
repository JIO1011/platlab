import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { errorResponse, healthResponse } from '@platlab/contracts';
import { buildApp } from './app.js';
import { createTestSigner } from './testing/tokens.js';

const signer = await createTestSigner();

/** Pool que falla si se usa: estas rutas deben responder antes de tocar la base. */
const untouchablePool = {
  connect: vi.fn(async () => {
    throw new Error('la base no debía usarse');
  }),
} as unknown as pg.Pool;

const app = () => buildApp({ pool: untouchablePool, verifyToken: signer.verifier });

describe('GET /health', () => {
  it('responde con el contrato de salud', async () => {
    const server = app();
    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponse.parse(response.json())).toEqual({ status: 'ok', service: 'api' });
    await server.close();
  });
});

describe('rutas /v1 sin identidad válida', () => {
  it.each([
    ['sin cabecera', undefined],
    ['con otro esquema', 'Basic dXNlcjpwYXNz'],
    ['con un token mal formado', 'Bearer abc'],
  ])('responde 401 IDENTITY_INVALID %s, sin caché y sin tocar la base', async (_case, header) => {
    const server = app();
    const response = await server.inject({
      method: 'GET',
      url: '/v1/me/workspaces',
      ...(header ? { headers: { authorization: header } } : {}),
    });

    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json()).error.code).toBe('IDENTITY_INVALID');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(untouchablePool.connect).not.toHaveBeenCalled();
    await server.close();
  });

  it('una ruta desconocida responde con el contrato de errores', async () => {
    const server = app();
    const response = await server.inject({ method: 'GET', url: '/no-existe' });

    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).error.code).toBe('NOT_FOUND');
    await server.close();
  });

  it('un workspaceId que no es UUID responde 400 VALIDATION_FAILED antes de consultar', async () => {
    const server = app();
    const response = await server.inject({
      method: 'GET',
      url: '/v1/workspaces/no-es-uuid/me',
      headers: { authorization: `Bearer ${await signer.sign('user-1')}` },
    });

    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).error.code).toBe('VALIDATION_FAILED');
    expect(untouchablePool.connect).not.toHaveBeenCalled();
    await server.close();
  });
});
