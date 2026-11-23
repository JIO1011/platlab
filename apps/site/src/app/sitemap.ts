import type { MetadataRoute } from "next";
import { SITE } from "@/shared/config/site-config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const rutas = ["/", "/precios/", "/demo/", "/privacidad/"];
  return rutas.map((ruta) => ({
    url: `${SITE.url}${ruta}`,
    lastModified: new Date("2026-11-18"),
  }));
}
