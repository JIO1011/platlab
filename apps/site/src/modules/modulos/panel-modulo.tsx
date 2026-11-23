import { Check } from "lucide-react";
import { toma, Ventana } from "@/modules/capturas";
import { Reveal } from "@/shared/ui/reveal";
import { ETAPAS, type ModuloInfo } from "./modulos";
import { ICONOS } from "./iconos";
import estilos from "./modulos.module.css";

/** Un módulo: la captura grande sobre su color y, al lado, lo mínimo para entenderlo. */
export function PanelModulo({ modulo, invertido }: { modulo: ModuloInfo; invertido: boolean }) {
  const Icono = ICONOS[modulo.slug];
  return (
    <article id={modulo.slug} data-modulo={modulo.slug} className={`${estilos.panel} ${invertido ? estilos.invertido : ""}`}>
      <Reveal className={estilos.campo}>
        <div className={modulo.secundaria ? estilos.conSecundaria : undefined}>
          <Ventana toma={toma(modulo.principal)} className={estilos.principal} />
          {modulo.secundaria && <Ventana toma={toma(modulo.secundaria)} className={estilos.secundaria} />}
        </div>
      </Reveal>
      <div className={estilos.texto}>
        <span className={estilos.icono} aria-hidden="true">
          <Icono size={26} strokeWidth={2} />
        </span>
        <h3 className={estilos.nombre}>{modulo.nombre}</h3>
        <p className={`${estilos.etapa} ${modulo.etapa === "piloto" ? estilos.piloto : ""}`}>{ETAPAS[modulo.etapa]}</p>
        <p className={estilos.resuelve}>{modulo.resuelve}</p>
        <ul className={estilos.puntos}>
          {modulo.puntos.map((p) => (
            <li key={p}>
              <Check size={18} strokeWidth={2.6} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
