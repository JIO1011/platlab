import { z } from 'zod';

/**
 * Cantidad exacta transportada como cadena decimal (03 §1).
 * Nunca se convierte a `number` para operar: la aritmética ocurre en PostgreSQL.
 */
export const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Debe ser un decimal sin notación científica');
