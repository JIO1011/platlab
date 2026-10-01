import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { createTestSigner, testAudience, testIssuer } from '../../testing/tokens.js';
import { AppError } from '../errors.js';

const signer = await createTestSigner();
const now = () => Math.floor(Date.now() / 1000);

async function rejection(token: string) {
  const error = await signer.verifier(token).then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AppError);
  return (error as AppError).code;
}

describe('createTokenVerifier', () => {
  it('acepta un JWT ES256 válido y devuelve su sujeto', async () => {
    await expect(signer.verifier(await signer.sign('user-1'))).resolves.toEqual({ subject: 'user-1' });
  });

  it('rechaza emisor, audiencia o vigencia incorrectos', async () => {
    expect(await rejection(await signer.sign('u', { issuer: 'https://otro.test/auth/v1' }))).toBe(
      'IDENTITY_INVALID',
    );
    expect(await rejection(await signer.sign('u', { audience: 'anon' }))).toBe('IDENTITY_INVALID');
    expect(await rejection(await signer.sign('u', { expiresAt: now() - 60 }))).toBe(
      'IDENTITY_INVALID',
    );
  });

  it('rechaza sesiones anónimas y roles que no son de usuario', async () => {
    expect(await rejection(await signer.sign('u', { claims: { is_anonymous: true } }))).toBe(
      'IDENTITY_INVALID',
    );
    expect(await rejection(await signer.sign('u', { claims: { role: 'service_role' } }))).toBe(
      'IDENTITY_INVALID',
    );
  });

  it('rechaza HS256 con secreto compartido aunque las demás afirmaciones sean válidas', async () => {
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256', kid: 'platlab-test-key' })
      .setSubject('u')
      .setIssuer(testIssuer)
      .setAudience(testAudience)
      .setExpirationTime(now() + 3600)
      .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
    expect(await rejection(token)).toBe('IDENTITY_INVALID');
  });

  it('rechaza un token firmado con otra clave', async () => {
    const other = await createTestSigner();
    expect(await rejection(await other.sign('u'))).toBe('IDENTITY_INVALID');
  });

  it('rechaza basura y tokens manipulados', async () => {
    expect(await rejection('no-es-un-jwt')).toBe('IDENTITY_INVALID');
    const [header, , signature] = (await signer.sign('u')).split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', role: 'authenticated' })).toString(
      'base64url',
    );
    expect(await rejection(`${header}.${forged}.${signature}`)).toBe('IDENTITY_INVALID');
  });
});
