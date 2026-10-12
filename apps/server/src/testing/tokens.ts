import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { createTokenVerifier } from '../platform/auth/jwt.js';

/** Emisor ficticio de las pruebas; el emisor real de Supabase Auth se prueba aparte. */
export const testIssuer = 'https://auth.platlab.test/auth/v1';
export const testAudience = 'authenticated';

export interface SignOptions {
  issuer?: string;
  audience?: string;
  /** Segundos desde la época; por defecto, dentro de una hora. */
  expiresAt?: number;
  claims?: JWTPayload;
}

/** Par de claves ES256 de un solo uso, con su JWKS local y un verificador configurado. */
export async function createTestSigner() {
  const kid = 'platlab-test-key';
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' }],
  });

  const sign = (subject: string, options: SignOptions = {}) =>
    new SignJWT({ role: 'authenticated', aal: 'aal1', is_anonymous: false, ...options.claims })
      .setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' })
      .setSubject(subject)
      .setIssuer(options.issuer ?? testIssuer)
      .setAudience(options.audience ?? testAudience)
      .setIssuedAt()
      .setExpirationTime(options.expiresAt ?? Math.floor(Date.now() / 1000) + 3600)
      .sign(privateKey);

  const verifier = createTokenVerifier({ keys, issuer: testIssuer, audience: testAudience });

  return { keys, sign, verifier };
}
