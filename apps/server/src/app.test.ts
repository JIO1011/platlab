import { describe, expect, it } from 'vitest';
import { healthResponse } from '@platlab/contracts';
import { buildApp } from './app.js';

describe('GET /health', () => {
  it('responde con el contrato de salud', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponse.parse(response.json())).toEqual({ status: 'ok', service: 'api' });
    await app.close();
  });
});
