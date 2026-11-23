import type { MetadataRoute } from "next";
import { CONTENIDO_PROVISIONAL, SITE } from "@/shared/config/site-config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (CONTENIDO_PROVISIONAL) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
