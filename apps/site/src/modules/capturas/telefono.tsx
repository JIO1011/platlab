import Image from "next/image";
import type { Toma } from "./tipos";
import estilos from "./telefono.module.css";

/** Una captura móvil dentro de un teléfono. */
export function Telefono({ toma, className = "" }: { toma: Toma; className?: string }) {
  return (
    <div className={`${estilos.telefono} ${className}`}>
      <div className={estilos.pantalla}>
        <Image src={toma.archivo} alt={toma.alt} width={toma.ancho} height={toma.alto} unoptimized className={estilos.imagen} />
      </div>
    </div>
  );
}
