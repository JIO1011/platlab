/**
 * Precios publicados (ADR 0032): pago único por espacio de trabajo, en USD y sin IVA, para el tramo S
 * (hasta 5 laboratorios). Desde el segundo año se paga solo el mantenimiento: el 20 % de lo adquirido,
 * salvo el paquete Institucional, que tiene una cifra fija. Las cifras viven solo aquí y en el ADR.
 */
export const PRECIOS = {
  nucleo: 1000,
  modulo: 1300,
  horaAdicional: 50,
  horasSoporteMes: 2,
  laboratoriosPorEspacio: 5,
} as const;

const TASA_MANTENIMIENTO = 0.2;
const MODULOS_DEL_PAQUETE = 5;

/** Límite de la compra pública directa (ínfima cuantía, ADR 0032): ningún primer pago debe alcanzarlo. */
export const TECHO_COMPRA_DIRECTA = 10000;

/** Primer año: el Núcleo más los módulos elegidos, en un solo pago. */
export function pagoUnico(modulos: number): number {
  return PRECIOS.nucleo + PRECIOS.modulo * modulos;
}

/** Desde el segundo año: el 20 % de lo adquirido. */
export function mantenimiento(modulos: number): number {
  return Math.round(pagoUnico(modulos) * TASA_MANTENIMIENTO);
}

/** El Núcleo con los cinco módulos, más barato que comprarlos por separado. */
export const PAQUETE = {
  pago: 5800,
  mantenimiento: 1200,
} as const;

/** Con estos módulos, ¿el paquete Institucional sale más barato que comprarlos sueltos? */
export function convienePaquete(modulos: number): boolean {
  return pagoUnico(modulos) > PAQUETE.pago;
}

/** Lo que ahorra el paquete frente a esos módulos por separado: el primer año y cada año desde el segundo. */
export function ahorroPaquete(modulos: number): { pago: number; mantenimiento: number } {
  return { pago: pagoUnico(modulos) - PAQUETE.pago, mantenimiento: mantenimiento(modulos) - PAQUETE.mantenimiento };
}

/** El descuento del paquete frente a los cinco módulos por separado. */
export const DESCUENTO_PAQUETE = ahorroPaquete(MODULOS_DEL_PAQUETE);

/** Los cinco módulos por separado: lo que el paquete descuenta. */
export const PRECIO_SUELTO = { pago: pagoUnico(MODULOS_DEL_PAQUETE), mantenimiento: mantenimiento(MODULOS_DEL_PAQUETE) } as const;

/** Montos en dólares con punto de miles: US$1.300. */
export function usd(monto: number): string {
  return `US$${String(monto).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export const ASUNTO_COTIZACION = "Cotización de PlatLab";

/** El cuerpo del correo para cotizar: lleva lo que el visitante eligió. */
export function mensajeCotizacion(eleccion: string): string {
  return `Hola, quiero una cotización de PlatLab: ${eleccion}.\n\nInstitución:\nLaboratorios:`;
}
