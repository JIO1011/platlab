import { ArrowRight, LogIn, Mail } from "lucide-react";
import { ACCESO_APP, SITE, enlaceCorreo } from "@/shared/config/site-config";
import { Seccion } from "@/shared/ui/bloques";
import estilos from "./secciones.module.css";

export function Contacto() {
  return (
    <Seccion id="contacto" tono="oscuro" etiqueta="Contacto">
      <div className={estilos.contacto}>
        <div>
          <h2 className={estilos.contactoTitulo}>Veamos PlatLab con su laboratorio.</h2>
          <p className={estilos.contactoTexto}>Escríbanos y coordinamos una demostración con los casos de su institución.</p>
        </div>
        <div className={estilos.contactoAcciones}>
          <a href={enlaceCorreo()} className="botonClaro">
            <Mail size={18} aria-hidden="true" />
            {SITE.contacto.correo}
          </a>
          <a href={ACCESO_APP} className={estilos.yaTiene}>
            <LogIn size={16} aria-hidden="true" />
            ¿Ya tiene cuenta? Iniciar sesión
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </Seccion>
  );
}
