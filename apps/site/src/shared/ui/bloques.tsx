import type { ReactNode } from "react";
import estilos from "./bloques.module.css";

type Tono = "claro" | "gris" | "oscuro";

export function Seccion({ id, tono = "claro", children, etiqueta }: { id?: string; tono?: Tono; children: ReactNode; etiqueta: string }) {
  return (
    <section id={id} aria-label={etiqueta} className={`${estilos.seccion} ${estilos[tono]} ${tono === "oscuro" ? "oscuro" : ""}`}>
      <div className="contenedor">{children}</div>
    </section>
  );
}

export function Encabezado({ titulo, intro, centrado = false }: { titulo: string; intro?: string; centrado?: boolean }) {
  return (
    <header className={`${estilos.encabezado} ${centrado ? estilos.centrado : ""}`}>
      <h2 className={estilos.titulo}>{titulo}</h2>
      {intro && <p className={estilos.intro}>{intro}</p>}
    </header>
  );
}
