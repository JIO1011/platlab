import { compareDecimals, nonNegativeQuantity, type ClosePracticeRequest, type LabsRequest } from '@platlab/contracts';
import { formatDecimal, normalizeDecimalInput, subtractDecimal } from '@platlab/ui';

type Block = LabsRequest['blocks'][number];

/** Un reactivo apartado en el bloque: lo que se rinde al cerrar. `line` es el número de la línea de la solicitud, desde 1. */
export interface CloseRow {
  line: number;
  name: string;
  unit: string;
  held: string;
}

/** Lo que escribe la persona por línea (`line` → texto); lo no escrito está vacío. */
export type UsedInputs = Record<number, string>;

/** Una fila al cerrar, con lo utilizado ya leído, lo devuelto y el motivo si no vale. */
interface CloseLine extends CloseRow {
  /** Lo utilizado como cadena decimal de la API; `null` mientras esté vacío o no valga. */
  used: string | null;
  /** Lo apartado menos lo utilizado; `null` mientras lo utilizado no valga. */
  returned: string | null;
  /** El campo está vacío: el motivo se muestra al intentar cerrar. */
  blank: boolean;
  issue: string | null;
}

export interface CloseSummary {
  lines: CloseLine[];
  usage: ClosePracticeRequest['usage'];
  canClose: boolean;
}

/** La cantidad con su unidad como se lee en pantalla: «1.250 g». */
export const quantityText = (value: string, unit: string): string => `${formatDecimal(value)} ${unit}`.trim();

const isPositive = (value: string) => compareDecimals(value, '0') === 1;

/** Los reactivos con algo apartado en el bloque: cada uno se rinde al cerrar (los equipos y el material no consumen). */
export function closeRows(lines: LabsRequest['lines'], block: Pick<Block, 'holds'>): CloseRow[] {
  return block.holds.flatMap((hold): CloseRow[] => {
    const line = lines[hold.line - 1];
    return line?.kind === 'reagent' && isPositive(hold.held) ? [{ line: hold.line, name: line.name, unit: line.unit, held: hold.held }] : [];
  });
}

/**
 * Lo utilizado es obligatorio, de cero a lo apartado, con coma o punto; lo devuelto es lo apartado menos lo utilizado,
 * con cadenas decimales (BigInt): nunca `number`.
 */
export function summarizeClose(rows: readonly CloseRow[], inputs: UsedInputs): CloseSummary {
  const lines = rows.map((row): CloseLine => {
    const text = normalizeDecimalInput(inputs[row.line] ?? '');
    if (text === '') return { ...row, used: null, returned: null, blank: true, issue: 'Indica cuánto se utilizó, aunque sea 0.' };
    if (!nonNegativeQuantity.safeParse(text).success) return { ...row, used: null, returned: null, blank: false, issue: 'Escribe una cantidad de cero o más, como 2,5.' };
    if (compareDecimals(text, row.held) === 1) {
      return { ...row, used: null, returned: null, blank: false, issue: `Solo se apartó ${quantityText(row.held, row.unit)}.` };
    }
    return { ...row, used: text, returned: subtractDecimal(row.held, text), blank: false, issue: null };
  });
  const usage = lines.flatMap((line) => (line.used === null ? [] : [{ line: line.line, used: line.used }]));
  return { lines, usage, canClose: lines.every((line) => line.issue === null) };
}
