import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3005",
    locale: "es-EC",
    timezoneId: "America/Guayaquil",
  },
  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "pnpm exec next start -p 3005",
    url: "http://localhost:3005",
    reuseExistingServer: true,
  },
});
