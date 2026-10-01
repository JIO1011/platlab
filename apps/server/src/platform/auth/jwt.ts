import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { AppError } from '../errors.js';

/** Identidad verificada del JWT. La membresía se comprueba después en PostgreSQL (ADR 0004). */
export interface VerifiedToken {
  subject: string;
}

export type TokenVerifier = (token: string) => Promise<VerifiedToken>;

export interface TokenVerifierOptions {
  /** Claves públicas: JWKS remoto de Supabase Auth o un conjunto local en pruebas. */
  keys: JWTVerifyGetKey;
  issuer: string;
  audience: string;
  /** Algoritmo asimétrico fijado; nunca HS256 con secreto compartido (ADR 0004). */
  algorithms?: string[];
}

export function remoteJwks(url: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(url));
}

const invalidToken = () => new AppError('IDENTITY_INVALID', 'Identidad inválida');

/**
 * Verifica firma, emisor, audiencia, algoritmo y vigencia. Rechaza sesiones anónimas y roles
 * distintos de `authenticated`. Un fallo del JWKS no es culpa del token: se propaga como error interno.
 */
export function createTokenVerifier({
  keys,
  issuer,
  audience,
  algorithms = ['ES256'],
}: TokenVerifierOptions): TokenVerifier {
  return async (token) => {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, keys, {
        issuer,
        audience,
        algorithms,
        requiredClaims: ['sub', 'exp'],
      }));
    } catch (error) {
      if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) {
        throw invalidToken();
      }
      throw error;
    }
    if (typeof payload.sub !== 'string' || payload.sub === '') throw invalidToken();
    if (payload['role'] !== 'authenticated' || payload['is_anonymous'] === true) throw invalidToken();
    return { subject: payload.sub };
  };
}
