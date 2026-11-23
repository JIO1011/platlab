import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Encabezado, Seccion } from "@/shared/ui/bloques";
import estilos from "./secciones.module.css";

const PASOS = [
  { titulo: "Demostración", texto: "Recorremos la plataforma con los casos de su laboratorio." },
  { titulo: "Piloto", texto: "Un espacio de prueba con sus áreas, módulos y usuarios." },
  { titulo: "Puesta en marcha", texto: "Carga de su catálogo, capacitación y acompañamiento." },
];

export function Empezar() {
  return (
    <Seccion id="empezar" tono="gris" etiqueta="Cómo empezar">
      <Encabezado titulo="De la demostración a la puesta en marcha" />
      <ol className={estilos.pasos}>
        {PASOS.map((p, i) => (
          <li key={p.titulo}>
            <span className={estilos.pasoNumero} aria-hidden="true">
              {i + 1}
            </span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </li>
        ))}
      </ol>
      <Link href="/precios/" className={estilos.verPrecios}>
        Ver precios
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </Seccion>
  );
}
