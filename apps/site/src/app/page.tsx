import { Portada } from "@/modules/portada";
import { IndiceModulos, MODULOS, PanelModulo } from "@/modules/modulos";
import { Celular, Contacto, Control, Empezar, ParaQuien } from "@/modules/secciones";
import { SITE } from "@/shared/config/site-config";
import { Encabezado, Seccion } from "@/shared/ui/bloques";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.nombre,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE.descripcion,
  inLanguage: "es-EC",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Portada />

      <Seccion id="modulos" etiqueta="Módulos de PlatLab">
        <Encabezado
          titulo="Cinco módulos, un mismo espacio de trabajo"
          intro="Cada institución activa solo los módulos que necesita, y puede sumar otros cuando los requiera."
        />
        <IndiceModulos />
        <div style={{ marginTop: "clamp(3.5rem, 7vw, 6rem)" }}>
          {MODULOS.map((m, i) => (
            <PanelModulo key={m.slug} modulo={m} invertido={i % 2 === 1} />
          ))}
        </div>
      </Seccion>

      <ParaQuien />
      <Control />
      <Celular />
      <Empezar />
      <Contacto />
    </>
  );
}
