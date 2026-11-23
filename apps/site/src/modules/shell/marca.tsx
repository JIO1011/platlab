import { FlaskConical } from "lucide-react";
import estilos from "./shell.module.css";

export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <span className={`${estilos.marca} ${claro ? estilos.marcaClara : ""}`}>
      <span className={estilos.marcaIcono} aria-hidden="true">
        <FlaskConical size={20} strokeWidth={2.2} />
      </span>
      PlatLab
    </span>
  );
}
