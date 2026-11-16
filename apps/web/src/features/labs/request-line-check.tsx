import { compareDecimals, type RequestLine } from '@platlab/contracts';
import { Tooltip, cn, formatDecimal } from '@platlab/ui';
import { Check, TriangleAlert, X } from 'lucide-react';
import type { Verdict } from './request-check';

/**
 * La marca de una línea junto a su cantidad (ADR 0023, «Disponibilidad y recursos»): solo el ícono, ✔ alcanza o ⚠ no
 * alcanza (✖ sin verificar, solo en la hoja de solo lectura). El detalle va en el nombre accesible y en el tooltip al pasar
 * el puntero. No se imprime.
 */

const marks = {
  ok: { Icon: Check, verdict: 'Alcanza', className: 'text-success' },
  short: { Icon: TriangleAlert, verdict: 'No alcanza', className: 'text-warning' },
  unverified: { Icon: X, verdict: 'Sin verificar', className: 'text-ink-subtle' },
} as const;

function Mark({ check, detail }: { check: RequestLine['check']; detail: string }) {
  const { Icon, verdict, className } = marks[check];
  const label = detail ? `${verdict}. ${detail}` : verdict;
  return (
    <Tooltip label={label}>
      <span role="img" aria-label={label} className={cn('flex size-6 shrink-0 items-center justify-center print:hidden', className)}>
        <Icon className="size-4" aria-hidden />
      </span>
    </Tooltip>
  );
}

const amount = (value: string, unit: string) => `${formatDecimal(value)} ${unit}`.trim();

/**
 * Lo que hay, dicho en una frase: lo libre de un reactivo, o los equipos libres en el horario (`slot`), operativos (sin
 * horario) o disponibles (`null`: lo guardado, sin saber cómo se contó).
 */
function freeText(line: RequestLine, slot: boolean | null): string | null {
  if (line.kind === 'reagent' && line.available !== null) {
    return compareDecimals(line.available, '0') <= 0 ? 'Sin stock libre' : `Hay ${amount(line.available, line.unit)} libres`;
  }
  if (line.kind === 'equipment' && line.available !== null) {
    const free = line.available;
    if (slot === null) return free === 0 ? 'Ninguno disponible' : `Hay ${free} ${free === 1 ? 'disponible' : 'disponibles'}`;
    if (!slot) return free === 0 ? 'Ninguno operativo' : `Hay ${free} ${free === 1 ? 'operativo' : 'operativos'}`;
    return free === 0 ? 'Ninguno libre en tu horario' : `Hay ${free} ${free === 1 ? 'libre' : 'libres'} en tu horario`;
  }
  return null;
}

/** Al llenar: la marca de lo que hay escrito ahora. Nada mientras se comprueba, si falta completar o sin verificar. */
export function VerdictMark({ verdict }: { verdict: Verdict }) {
  if (verdict.state !== 'checked' || verdict.line.check === 'unverified') return null;
  const { line } = verdict;
  const free = freeText(line, verdict.slot);
  if (!free) return <Mark check={line.check} detail="" />;
  if (line.check === 'ok') return <Mark check="ok" detail={`${free}.`} />;
  const asked = line.kind === 'reagent' ? amount(verdict.needed, line.unit) : String(line.quantity);
  const forDates = line.kind === 'reagent' && verdict.dates > 1 ? ` para tus ${verdict.dates} fechas` : '';
  return <Mark check="short" detail={`${free}; pides ${asked}${forDates}.`} />;
}

/** En la hoja de solo lectura: lo que el servidor dijo de la línea guardada. */
export function SavedMark({ line }: { line: RequestLine }) {
  if (line.check === 'unverified') return <Mark check="unverified" detail="No hay inventario que lo compruebe." />;
  const free = freeText(line, null);
  return <Mark check={line.check} detail={free ? `${free}.` : ''} />;
}
