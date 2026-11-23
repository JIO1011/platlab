import { CalendarDays, FlaskConical, Microscope, Package, Wrench, type LucideIcon } from "lucide-react";
import type { ModuloInfo } from "./modulos";

/** El ícono de cada módulo: el mismo de la app. */
export const ICONOS: Record<ModuloInfo["slug"], LucideIcon> = {
  reactivos: FlaskConical,
  equipos: Microscope,
  laboratorios: CalendarDays,
  mantenimiento: Wrench,
  materiales: Package,
};
