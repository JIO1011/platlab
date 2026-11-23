import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createTokenVerifier, remoteJwks } from '../platform/auth/jwt.js';
import { createPool } from '../platform/db/pool.js';
import { publicFiles } from '../platform/storage/public-files.js';

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

const app = buildApp({ pool, verifyToken, publicFiles: publicFiles(config.storage), logger: config.production });
app.addHook('onClose', async () => {
  await pool.end();
});

// Render avisa con SIGTERM antes de reemplazar el contenedor: se atienden las peticiones en curso y se cierra el pool.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error(error);
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`API escuchando en http://${config.host}:${config.port}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
