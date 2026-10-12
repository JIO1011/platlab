import { cn } from '../lib/cn';
import { formatDecimal } from '../lib/decimal';

export interface QuantityProps {
  /** Cadena decimal de la API; nunca un `number`. */
  value: string;
  unit: string;
  /** Muestra el signo + en entradas, para leer el historial como un libro. */
  signed?: boolean;
  className?: string;
  /** Tamaño de la unidad cuando no acompaña al de la cifra, como en las tarjetas de catálogo. */
  unitClassName?: string;
}

export function Quantity({ value, unit, signed = false, className, unitClassName }: QuantityProps) {
  const text = formatDecimal(value);
  const prefix = signed && !value.startsWith('-') ? '+' : '';
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {prefix}
      {text} <span className={cn('font-normal text-ink-muted', unitClassName)}>{unit}</span>
    </span>
  );
}
