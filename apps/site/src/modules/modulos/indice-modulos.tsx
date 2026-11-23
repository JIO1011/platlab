import { ETAPAS, MODULOS } from "./modulos";
import { ICONOS } from "./iconos";
import estilos from "./modulos.module.css";

/** Los cinco módulos de un vistazo; cada uno lleva a su panel. */
export function IndiceModulos() {
  return (
    <ul className={estilos.indice}>
      {MODULOS.map((m) => {
        const Icono = ICONOS[m.slug];
        return (
          <li key={m.slug} data-modulo={m.slug}>
            <a href={`#${m.slug}`} className={estilos.indiceEnlace}>
              <span className={estilos.indiceIcono} aria-hidden="true">
                <Icono size={24} strokeWidth={2} />
              </span>
              <span className={estilos.indiceNombre}>{m.nombre}</span>
              <span className={`${estilos.etapa} ${m.etapa === "piloto" ? estilos.piloto : ""}`}>{ETAPAS[m.etapa]}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
