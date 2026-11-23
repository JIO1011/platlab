import Image from "next/image";
import { Lock } from "lucide-react";
import { HOST_APP } from "@/shared/config/site-config";
import type { Toma } from "./tipos";
import estilos from "./ventana.module.css";

type Props = {
  toma: Toma;
  className?: string;
  /** Imagen de la primera pantalla: se carga sin espera. */
  prioridad?: boolean;
  /** Recorta la captura a esta proporción (por ejemplo «16 / 7»), alineada arriba a la izquierda. */
  aspecto?: string;
};

/** Una captura dentro de una ventana de navegador. */
export function Ventana({ toma, className = "", prioridad = false, aspecto }: Props) {
  return (
    <div className={`${estilos.ventana} ${className}`}>
      <div className={estilos.barra} aria-hidden="true">
        <span className={estilos.puntos}>
          <i />
          <i />
          <i />
        </span>
        <span className={estilos.direccion}>
          <Lock size={11} strokeWidth={2.4} />
          {HOST_APP}
        </span>
      </div>
      <div className={estilos.pantalla} style={aspecto ? { aspectRatio: aspecto } : undefined}>
        <Image
          src={toma.archivo}
          alt={toma.alt}
          width={toma.ancho}
          height={toma.alto}
          unoptimized
          priority={prioridad}
          className={aspecto ? `${estilos.imagen} ${estilos.recortada}` : estilos.imagen}
        />
      </div>
    </div>
  );
}
