import estilos from "./precios.module.css";

const PREGUNTAS = [
  {
    pregunta: "¿Cobran por usuario?",
    respuesta: "No. Se paga por espacio de trabajo: docentes, técnicos y estudiantes son ilimitados.",
  },
  {
    pregunta: "¿Qué es un espacio de trabajo?",
    respuesta: "Una facultad, sede o clínica con sus laboratorios, personas e inventario propios. Cada espacio se adquiere por separado.",
  },
  {
    pregunta: "¿Puedo probarlo antes?",
    respuesta:
      "Sí. Empezamos con un piloto pagado de 90 días con su laboratorio, y su valor se descuenta del precio si continúa.",
  },
  {
    pregunta: "¿Cómo compra una institución pública?",
    respuesta: "Le enviamos una proforma con la ficha técnica para su proceso de compra.",
  },
  {
    pregunta: "¿Qué pasa si mi espacio es más grande?",
    respuesta: "Los espacios de más de cinco laboratorios se cotizan aparte, igual que las migraciones de datos fuera de la plantilla de PlatLab y los desarrollos a medida.",
  },
];

export function Preguntas() {
  return (
    <dl className={estilos.preguntas}>
      {PREGUNTAS.map((p) => (
        <div key={p.pregunta}>
          <dt>{p.pregunta}</dt>
          <dd>{p.respuesta}</dd>
        </div>
      ))}
    </dl>
  );
}
