import Link from "next/link";
import { ACCESO_APP, SITE } from "@/shared/config/site-config";
import { Marca } from "./marca";
import estilos from "./shell.module.css";

export function Pie() {
  return (
    <footer className={`oscuro ${estilos.pie}`}>
      <div className={`contenedor ${estilos.pieFila}`}>
        <div>
          <Marca claro />
          <p className={estilos.pieTexto}>{SITE.lema}.</p>
        </div>
        <nav aria-label="Pie" className={estilos.pieNav}>
          <Link href="/#modulos">Módulos</Link>
          <Link href="/#para-quien">Para quién</Link>
          <Link href="/demo/">Solicitar demostración</Link>
          <a href={ACCESO_APP}>Iniciar sesión</a>
          <Link href="/privacidad/">Privacidad</Link>
        </nav>
        <address className={estilos.contacto}>
          <a href={`mailto:${SITE.contacto.correo}`}>{SITE.contacto.correo}</a>
        </address>
      </div>
      <p className={`contenedor ${estilos.legal}`}>
        © {new Date().getFullYear()} PlatLab. Las pantallas mostradas corresponden a una demostración con datos de ejemplo.
      </p>
    </footer>
  );
}
