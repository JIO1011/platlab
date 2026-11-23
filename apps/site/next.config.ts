import type { NextConfig } from "next";

/*
 * Sitio estático: `next build` escribe `out/`. Las cabeceras de seguridad no pasan por
 * `headers()` (no hay servidor); viven en `public/_headers`, que Cloudflare lee al servir.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  agentRules: false,
};

export default nextConfig;
