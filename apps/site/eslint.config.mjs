import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "scripts/**", "e2e/**"]),
  {
    // Las dependencias van en un solo sentido: app → modules → shared.
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/modules/*", "@/app/*"] }],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/app/*"] }],
    },
  },
]);
