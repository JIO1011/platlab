/**
 * Los módulos que ya existen en PlatLab. Fuente: docs/01_producto.md §3 y ADR 0030. La etapa es
 * la real: «Construir un módulo no lo pone a la venta», así que solo los que están en piloto se
 * presentan como tales y el resto como «Próximamente».
 */
export type Etapa = "piloto" | "proximamente";

export type ModuloInfo = {
  slug: "reactivos" | "equipos" | "laboratorios" | "mantenimiento" | "materiales";
  nombre: string;
  /** Una línea: qué resuelve. */
  resuelve: string;
  etapa: Etapa;
  puntos: string[];
  /** Ids de capturas (manifiesto). */
  principal: string;
  secundaria?: string;
};

export const ETAPAS: Record<Etapa, string> = { piloto: "En piloto", proximamente: "Próximamente" };

export const MODULOS: ModuloInfo[] = [
  {
    slug: "reactivos",
    nombre: "Reactivos",
    resuelve: "Qué hay, dónde está y en qué estado.",
    etapa: "piloto",
    puntos: ["Salidas con aprobación del administrador", "Caducidad y existencias mínimas a la vista", "Informe de sustancias controladas en PDF y Excel"],
    principal: "reactivos-resumen",
    secundaria: "reactivos-solicitudes",
  },
  {
    slug: "laboratorios",
    nombre: "Laboratorios",
    resuelve: "Solicitudes y cronograma de los espacios, sin choques de horario.",
    etapa: "piloto",
    puntos: ["Solicitudes con el formato de su institución", "Cronograma por áreas", "Aprobación del administrador"],
    principal: "labs-cronograma",
    secundaria: "labs-recibidas",
  },
  {
    slug: "equipos",
    nombre: "Equipos",
    resuelve: "Cada equipo, con su responsable y su estado.",
    etapa: "proximamente",
    puntos: ["Inventario por áreas con encargado", "Fallas reportadas desde el celular", "Disponibilidad siempre al día"],
    principal: "equipos-inventario",
    secundaria: "equipos-incidentes",
  },
  {
    slug: "mantenimiento",
    nombre: "Mantenimiento",
    resuelve: "Que los equipos sigan funcionando.",
    etapa: "proximamente",
    puntos: ["Planes preventivos y calibraciones", "Lo atrasado, primero", "Registro con informe y costo"],
    principal: "mantenimiento-por-hacer",
  },
  {
    slug: "materiales",
    nombre: "Materiales",
    resuelve: "Consumibles, reutilizables y préstamos.",
    etapa: "proximamente",
    puntos: ["Préstamos con vale", "Devoluciones parciales", "Atrasados a la vista"],
    principal: "materiales-prestamos",
  },
];
