import { toma, Ventana } from "@/modules/capturas";
import { Encabezado, Seccion } from "@/shared/ui/bloques";
import { Reveal } from "@/shared/ui/reveal";
import estilos from "./secciones.module.css";

const GARANTIAS = [
  { titulo: "Aprobación antes de descontar", texto: "Quien pide no descuenta: el administrador aprueba y solo entonces se mueve el saldo." },
  { titulo: "Historial que no se borra", texto: "Un error se corrige con otro movimiento, con su autor y su fecha." },
  { titulo: "Cada persona ve lo suyo", texto: "Administrador, operador, docente y estudiante tienen permisos distintos." },
  { titulo: "Datos separados por institución", texto: "Cada espacio de trabajo es independiente: nada se comparte entre instituciones." },
  { titulo: "Sustancias controladas", texto: "Informe con marca «Controlado», filtro y exportación a PDF y Excel." },
];

const ROLES = [
  { id: "rol-admin", nombre: "Administrador" },
  { id: "rol-operador", nombre: "Operador" },
  { id: "rol-docente", nombre: "Docente" },
];

export function Control() {
  return (
    <Seccion id="control" tono="gris" etiqueta="Control y trazabilidad">
      <Encabezado titulo="Cada movimiento, aprobado y registrado" intro="Reglas que protegen el inventario y respaldan a quien responde por el laboratorio." />
      <div className={estilos.control}>
        <Reveal className={estilos.controlImagen}>
          <Ventana toma={toma("reactivos-movimientos")} />
        </Reveal>
        <ul className={estilos.garantias}>
          {GARANTIAS.map((g) => (
            <li key={g.titulo}>
              <h3>{g.titulo}</h3>
              <p>{g.texto}</p>
            </li>
          ))}
        </ul>
      </div>

      <h3 className={estilos.subtitulo}>La misma pantalla de inicio, según el rol</h3>
      <div className={estilos.roles}>
        {ROLES.map((r, i) => (
          <Reveal key={r.id} retraso={i * 100}>
            <figure className={estilos.rol}>
              <Ventana toma={toma(r.id)} aspecto="8 / 5" />
              <figcaption>{r.nombre}</figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Seccion>
  );
}
