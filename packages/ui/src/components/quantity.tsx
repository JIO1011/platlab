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

/** Unidades de conteo con nombre (Materiales, ADR 0025): van en plural salvo con exactamente una. Los símbolos (g, mL, u) no cambian. */
const plurals: Readonly<Record<string, string>> = {
  par: 'pares',
  caja: 'cajas',
  bolsa: 'bolsas',
  paquete: 'paquetes',
  rollo: 'rollos',
  frasco: 'frascos',
  tubo: 'tubos',
  sobre: 'sobres',
  kit: 'kits',
};

/** La unidad como se lee junto a su cifra: «1 caja», «4 cajas», «-1 par», «2,5 m». */
export const unitText = (unit: string, value: string) => (plurals[unit] && !/^-?1(?:\.0+)?$/.test(value) ? plurals[unit] : unit);

export function Quantity({ value, unit, signed = false, className, unitClassName }: QuantityProps) {
  const text = formatDecimal(value);
  const prefix = signed && !value.startsWith('-') ? '+' : '';
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {prefix}
      {text} <span className={cn('font-normal text-ink-muted', unitClassName)}>{unitText(unit, value)}</span>
    </span>
  );
}
