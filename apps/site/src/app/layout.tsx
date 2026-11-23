import type { Metadata } from "next";
import { Cabecera, Pie } from "@/modules/shell";
import { CONTENIDO_PROVISIONAL, SITE } from "@/shared/config/site-config";
import "@/shared/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.nombre} — ${SITE.lema}`,
    template: `%s · ${SITE.nombre}`,
  },
  description: SITE.descripcion,
  robots: CONTENIDO_PROVISIONAL ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    title: `${SITE.nombre} — ${SITE.lema}`,
    description: SITE.descripcion,
    url: SITE.url,
    siteName: SITE.nombre,
    locale: "es_EC",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-EC">
      <body>
        <a href="#contenido" className="salto">
          Saltar al contenido
        </a>
        <Cabecera />
        <main id="contenido">{children}</main>
        <Pie />
      </body>
    </html>
  );
}
