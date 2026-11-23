import Link from "next/link";
import { Encabezado, Seccion } from "@/shared/ui/bloques";

export default function NotFound() {
  return (
    <Seccion etiqueta="Página no encontrada">
      <Encabezado titulo="Esta página no existe" intro="Vuelva al inicio para conocer los módulos de PlatLab." centrado />
      <div style={{ textAlign: "center" }}>
        <Link href="/" className="boton">
          Ir al inicio
        </Link>
      </div>
    </Seccion>
  );
}
