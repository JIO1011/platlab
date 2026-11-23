import type { Metadata } from "next";
import { Calculadora, ComoSePaga, Paquete, Preguntas } from "@/modules/precios";
import { Contacto } from "@/modules/secciones";
import { Encabezado, Seccion } from "@/shared/ui/bloques";

export const metadata: Metadata = {
  title: "Precios",
  description: "Precios de PlatLab: un solo pago por los módulos que elija, sin cobro por usuario, y mantenimiento anual desde el segundo año.",
};

export default function PreciosPage() {
  return (
    <>
      <Seccion etiqueta="Cómo se paga">
        <Encabezado
          titulo="Pague una vez. Después, solo el mantenimiento."
          intro="Por espacio de trabajo y sin cobro por usuario: docentes, técnicos y estudiantes son ilimitados."
        />
        <ComoSePaga />
      </Seccion>

      <Seccion id="calcular" tono="gris" etiqueta="Arme su plan">
        <Encabezado titulo="Arme su plan" intro="Marque los módulos que necesita y vea cuánto paga el primer año y los siguientes." />
        <Calculadora />
      </Seccion>

      <Seccion id="paquete" tono="oscuro" etiqueta="Paquete Institucional">
        <Paquete />
      </Seccion>

      <Seccion etiqueta="Preguntas frecuentes">
        <Encabezado titulo="Preguntas frecuentes" />
        <Preguntas />
      </Seccion>

      <Contacto />
    </>
  );
}
