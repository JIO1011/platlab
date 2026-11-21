// Empaqueta la API en un solo archivo para producción (ADR 0033). Los paquetes del monorepo se publican como
// TypeScript, así que se incluyen en el paquete; la imagen no necesita `node_modules`.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/entrypoints/api.ts'],
  outfile: 'dist/api.mjs',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  // `pg` solo carga el enlace nativo si existe; no se usa.
  external: ['pg-native'],
  // Algunas dependencias son CommonJS y llaman a `require` dentro del paquete ESM.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  sourcemap: true,
  logLevel: 'info',
});
