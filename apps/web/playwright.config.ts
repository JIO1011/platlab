import { defineConfig, devices } from '@playwright/test';

/**
 * Flujo de G0 en el navegador (primer incremento, paso 5). Requiere Supabase local con el seed
 * de demo (`pnpm db:start`); levanta la API y la vista previa de la web si no están en marcha.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: 'pnpm --filter @platlab/server start',
      cwd: '../..',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: true,
    },
    { command: 'pnpm build && pnpm preview', url: 'http://localhost:4173', reuseExistingServer: true },
  ],
});
