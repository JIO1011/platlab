import { PRECIOS, usd } from "./precios";
import estilos from "./precios.module.css";

const PASOS = [
  {
    cuando: "Año 1",
    titulo: "Un solo pago",
    texto: "Paga una vez el Núcleo y los módulos que elija. Incluye la puesta en marcha y la capacitación.",
  },
  {
    cuando: "Desde el año 2",
    titulo: "Solo el mantenimiento",
    texto: `El 20 % al año de lo que adquirió: servidores, copias de seguridad, actualizaciones y hasta ${PRECIOS.horasSoporteMes} horas de soporte al mes.`,
  },
  {
    cuando: "Cuando lo necesite",
    titulo: "Sume módulos",
    texto: `Agregue otro módulo en cualquier momento y pague solo ese: ${usd(PRECIOS.modulo)}.`,
  },
];

/** Cómo se paga PlatLab, en el orden en que ocurre. */
export function ComoSePaga() {
  return (
    <ol className={estilos.pasos}>
      {PASOS.map((p) => (
        <li key={p.cuando}>
          <span className={estilos.cuando}>{p.cuando}</span>
          <h3>{p.titulo}</h3>
          <p>{p.texto}</p>
        </li>
      ))}
    </ol>
  );
}
