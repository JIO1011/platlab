// Prototipo R-01D: solo interfaz

/** Resultado de revisar un número CAS mientras se escribe. */
export type CasCheck = 'empty' | 'partial' | 'valid' | 'invalid';

/**
 * Número CAS (NNNNNNN-NN-N): el último dígito es de control. Se suman los demás de derecha a
 * izquierda por su posición (1, 2, 3…) y el resultado, módulo 10, debe ser el dígito de control.
 * Mientras el formato no esté completo no es un error, solo «parcial».
 */
export function checkCas(value: string): CasCheck {
  const text = value.trim();
  if (text === '') return 'empty';
  const complete = /^(\d{2,7})-(\d{2})-(\d)$/.exec(text);
  if (!complete) return /^\d{0,7}(-\d{0,2}(-\d?)?)?$/.test(text) ? 'partial' : 'invalid';
  const digits = `${complete[1]}${complete[2]}`.split('').reverse();
  const sum = digits.reduce((total, digit, index) => total + Number(digit) * (index + 1), 0);
  return sum % 10 === Number(complete[3]) ? 'valid' : 'invalid';
}
