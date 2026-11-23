import Link from "next/link";
import { LogIn, Menu } from "lucide-react";
import { ACCESO_APP } from "@/shared/config/site-config";
import { Marca } from "./marca";
import estilos from "./shell.module.css";

const ENLACES = [
  { href: "/precios/", etiqueta: "Precios" },
];

/** Barra superior fija. El menú del móvil es un <details>: funciona sin JavaScript. */
export function Cabecera() {
  return (
    <header className={estilos.cabecera}>
      <div className={`contenedor ${estilos.fila}`}>
        <Link href="/" aria-label="PlatLab, inicio">
          <Marca />
        </Link>
        <nav aria-label="Principal" className={estilos.nav}>
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href}>
              {e.etiqueta}
            </Link>
          ))}
        </nav>
        <div className={estilos.acciones}>
          <a href={ACCESO_APP} className={`botonSecundario chico ${estilos.acceso}`}>
            <LogIn size={16} aria-hidden="true" />
            Iniciar sesión
          </a>
          <Link href="/demo/" className={`boton chico ${estilos.demo}`}>
            Solicitar demostración
          </Link>
        </div>
        <details className={estilos.movil}>
          <summary aria-label="Abrir el menú">
            <Menu size={22} aria-hidden="true" />
          </summary>
          <nav aria-label="Menú móvil" className={estilos.panel}>
            {ENLACES.map((e) => (
              <Link key={e.href} href={e.href} className={estilos.enlaceMovil}>
                {e.etiqueta}
              </Link>
            ))}
            <a href={ACCESO_APP} className="botonSecundario">
              <LogIn size={16} aria-hidden="true" />
              Iniciar sesión
            </a>
            <Link href="/demo/" className="boton">
              Solicitar demostración
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
