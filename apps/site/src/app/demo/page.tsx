import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { SITE, enlaceCorreo } from "@/shared/config/site-config";
import { Encabezado, Seccion } from "@/shared/ui/bloques";
import estilos from "./page.module.css";

export const metadata: Metadata = {
  title: "Solicitar una demostración",
  description: "Coordine una demostración guiada de PlatLab con los casos de su laboratorio.",
};

const PASOS_DEMO = [
  "Revisamos cuántos laboratorios o áreas tiene su institución y quiénes participan: administradores, operadores y docentes.",
  "Recorremos en vivo los módulos de su interés: Reactivos, Laboratorios, Equipos, Mantenimiento o Materiales.",
  "Definimos el alcance del piloto y la carga inicial de su catálogo.",
];

export default function DemoPage() {
  return (
    <Seccion etiqueta="Solicitar una demostración">
      <Link href="/" className={estilos.volver}>
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al inicio
      </Link>
      <Encabezado
        titulo="Conversemos sobre su laboratorio"
        intro="Escríbanos con los datos básicos de su institución y agendamos una sesión en vivo."
      />

      <div className={estilos.tarjeta}>
        <div className={estilos.columna}>
          <h3>Qué veremos en la sesión</h3>
          <ul className={estilos.lista}>
            {PASOS_DEMO.map((p) => (
              <li key={p}>
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={estilos.contacto}>
          <h3>Contacto directo</h3>
          <p>El botón abre su correo con una plantilla breve: institución, número de laboratorios y módulos de interés.</p>
          <a href={enlaceCorreo()} className="boton">
            <Mail size={18} aria-hidden="true" />
            {SITE.contacto.correo}
          </a>
        </div>
      </div>
    </Seccion>
  );
}
