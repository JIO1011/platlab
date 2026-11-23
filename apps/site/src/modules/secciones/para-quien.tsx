import { toma, Ventana } from "@/modules/capturas";
import { Encabezado, Seccion } from "@/shared/ui/bloques";
import { Reveal } from "@/shared/ui/reveal";
import estilos from "./secciones.module.css";

const PUBLICOS = [
  {
    titulo: "Universidades",
    captura: "labs-cronograma",
    lineas: [
      "Varios laboratorios, docentes y tesistas en un mismo espacio de trabajo.",
      "Prácticas solicitadas por los docentes y programadas sin choques de horario.",
      "Cada persona ve solo lo que le corresponde según su rol.",
    ],
  },
  {
    titulo: "Clínicas y salud",
    captura: "reactivos-inventario",
    lineas: [
      "Insumos con fecha de vencimiento y existencias mínimas siempre a la vista.",
      "Lo que vence o se agota se señala antes de que falte.",
      "Cada entrega y cada consumo queda registrado con su responsable.",
    ],
  },
];

export function ParaQuien() {
  return (
    <Seccion id="para-quien" etiqueta="Para quién">
      <Encabezado titulo="Pensado para universidades y clínicas" intro="Dos formas de trabajar con el mismo orden: quién pide, quién aprueba y qué queda guardado." />
      <div className={estilos.publicos}>
        {PUBLICOS.map((p, i) => (
          <Reveal key={p.titulo} retraso={i * 120} className={estilos.publico}>
            <Ventana toma={toma(p.captura)} aspecto="16 / 10" className={estilos.publicoImagen} />
            <h3 className={estilos.publicoTitulo}>{p.titulo}</h3>
            <ul className={estilos.lineas}>
              {p.lineas.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Seccion>
  );
}
