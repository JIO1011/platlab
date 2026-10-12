// Genera la clave ES256 con la que Supabase Auth local firma los JWT (ADR 0004), si aún no existe.
// Es solo de desarrollo y CI: cada máquina tiene la suya y nunca se versiona (.gitignore).
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = fileURLToPath(new URL('../supabase/signing_keys.json', import.meta.url));
// Ruta explícita a la CLI instalada como dependencia: un nombre suelto puede resolver
// a la carpeta supabase/ del repositorio.
const cli = fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url));

if (!existsSync(path)) {
  // config.toml ya apunta al archivo, así que la CLI exige que exista: se parte de una lista
  // vacía y la CLI añade la clave nueva.
  writeFileSync(path, '[]\n', { mode: 0o600 });
  try {
    execFileSync(cli, ['gen', 'signing-key', '--algorithm', 'ES256', '--append'], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const keys = JSON.parse(readFileSync(path, 'utf8'));
    if (!Array.isArray(keys) || keys.length !== 1) throw new Error('La CLI no escribió la clave');
    chmodSync(path, 0o600);
  } catch (error) {
    rmSync(path, { force: true });
    throw error;
  }
  console.log('Clave local de firma creada en supabase/signing_keys.json');
}
