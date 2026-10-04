import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createTokenVerifier, remoteJwks } from '../platform/auth/jwt.js';
import { createPool } from '../platform/db/pool.js';

const config = loadConfig();
const pool = createPool({
  connectionString: config.databaseUrl,
  // Solo ocurre con conexiones ya abiertas, cuando `app` existe.
  onIdleError: (error) => app.log.warn({ err: error }, 'Conexión inactiva con PostgreSQL perdida; el pool abre otra'),
});
const verifyToken = createTokenVerifier({
  keys: remoteJwks(config.auth.jwksUrl),
  issuer: config.auth.issuer,
  audience: config.auth.audience,
});

const app = buildApp({ pool, verifyToken });
app.addHook('onClose', async () => {
  await pool.end();
});

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`API escuchando en http://${config.host}:${config.port}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
