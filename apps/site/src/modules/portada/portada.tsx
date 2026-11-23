import { ArrowRight } from "lucide-react";
import { toma, Telefono, Ventana } from "@/modules/capturas";
import Link from "next/link";
import estilos from "./portada.module.css";

/** Primera pantalla: la promesa en una frase y el producto real emergiendo debajo. */
export function Portada() {
  return (
    <section className={`oscuro ${estilos.portada}`} aria-label="Presentación">
      <div className={`contenedor ${estilos.cabeza}`}>
        <h1 className={estilos.titular}>Todo su laboratorio, en un solo lugar y bajo control.</h1>
        <div className={estilos.lado}>
          <p className={estilos.bajada}>
            Reactivos, equipos, prácticas, mantenimiento y préstamos, con aprobaciones y el registro de cada movimiento.
          </p>
          <div className={estilos.acciones}>
            <Link href="/demo/" className="botonClaro">
              Solicitar demostración
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#modulos" className="botonFantasma">
              Ver los módulos
            </a>
          </div>
        </div>
      </div>

      <div className={`contenedor ${estilos.escena}`}>
        <div className={estilos.recorte}>
          <Ventana toma={toma("inicio")} className={estilos.ventana} prioridad />
          <Telefono toma={toma("movil-inicio")} className={estilos.telefono} />
        </div>
      </div>
    </section>
  );
}
