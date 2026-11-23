import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado, Seccion } from "@/shared/ui/bloques";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Política de privacidad y tratamiento de datos del sitio público de PlatLab.",
};

export default function PrivacidadPage() {
  return (
    <Seccion etiqueta="Privacidad">
      <Encabezado titulo="Un sitio estático que no le rastrea" intro="Este sitio informativo no utiliza cookies publicitarias ni rastreadores de terceros." />
      <div style={{ maxWidth: "44rem", display: "grid", gap: "1rem" }}>
        <p>
          <strong>Sitio público:</strong> las páginas se sirven de forma estática. No guardamos perfiles de navegación ni compartimos información con redes publicitarias.
        </p>
        <p>
          <strong>Solicitudes de demostración:</strong> cuando nos escribe por correo, usamos sus datos únicamente para responderle y coordinar la sesión.
        </p>
        <p>
          <strong>Datos mostrados en las capturas:</strong> todas las pantallas y nombres de este sitio corresponden a datos de ejemplo de la demostración de PlatLab.
        </p>
        <p>
          <Link href="/" style={{ color: "var(--brand)", fontWeight: 600 }}>
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </Seccion>
  );
}
