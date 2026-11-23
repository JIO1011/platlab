import { toma, Telefono } from "@/modules/capturas";
import { Seccion } from "@/shared/ui/bloques";
import { Reveal } from "@/shared/ui/reveal";
import estilos from "./secciones.module.css";

const PANTALLAS = [
  { id: "movil-inicio", titulo: "Su espacio en el bolsillo" },
  { id: "movil-inventario", titulo: "Escanear un frasco" },
  { id: "movil-incidentes", titulo: "Reportar una falla" },
];

export function Celular() {
  return (
    <Seccion id="celular" etiqueta="En el celular">
      <div className={estilos.celular}>
        <div className={estilos.celularTexto}>
          <h2 className={estilos.celularTitulo}>También en el celular, sin instalar nada</h2>
          <p>Funciona en el navegador y escanea códigos QR con la cámara. El registro se hace donde ocurre: frente al estante o junto al equipo.</p>
        </div>
        <ul className={estilos.telefonos}>
          {PANTALLAS.map((p, i) => (
            <li key={p.id} className={estilos.telefonoItem}>
              <Reveal retraso={i * 110}>
                <Telefono toma={toma(p.id)} />
                <p className={estilos.telefonoLeyenda}>{p.titulo}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </Seccion>
  );
}
