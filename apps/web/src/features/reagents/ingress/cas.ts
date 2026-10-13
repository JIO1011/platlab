import { newProduct } from '@platlab/contracts';

/** Resultado de revisar un número CAS mientras se escribe. */
export type CasCheck = 'empty' | 'partial' | 'valid' | 'invalid';

const casNumber = newProduct.shape.casNumber;

/**
 * Número CAS (NNNNNNN-NN-N) con su dígito de control, con la regla del contrato. Mientras el formato
 * no está completo no es un error, solo «parcial».
 */
export function checkCas(value: string): CasCheck {
  const text = value.trim();
  if (text === '') return 'empty';
  if (/^\d{2,7}-\d{2}-\d$/.test(text)) return casNumber.safeParse(text).success ? 'valid' : 'invalid';
  return /^\d{0,7}(-\d{0,2}(-\d?)?)?$/.test(text) ? 'partial' : 'invalid';
}
