import type { LabsRequest } from '@platlab/contracts';
import { formatDecimal, subtractDecimal } from '@platlab/ui';

type Block = LabsRequest['blocks'][number];
type Line = LabsRequest['lines'][number];

/** Lo apartado de una línea para una fecha: lo que dice (`text`) y, si no alcanza, lo que falta (`missing`). */
export interface HoldRow {
  line: number;
  text: string;
  missing: string | null;
}

const lower = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

/** «Falta 1 balanza» / «Faltan 2 de balanza»: sin inventar plurales de nombres del catálogo. */
function missingEquipment(name: string, count: number): string {
  return count === 1 ? `Falta 1 ${lower(name)}` : `Faltan ${count} de ${lower(name)}`;
}

/**
 * Lo apartado por línea reservable de un bloque (L-01d). `hold.line` es el número de la línea en la solicitud, desde 1.
 * Los reactivos: «Cloruro de sodio: apartado 30 de 50 g» y «Falta 20 g», con la resta exacta de decimales; los equipos:
 * «Balanza: BAL-01, BAL-02» y «Falta 1 balanza». Las líneas sin catálogo y el material no se reservan y no aparecen.
 */
export function holdRows(lines: readonly Line[], block: Pick<Block, 'holds'>): HoldRow[] {
  return block.holds.flatMap((hold): HoldRow[] => {
    const line = lines[hold.line - 1];
    if (!line) return [];
    if (line.kind === 'reagent') {
      const left = subtractDecimal(line.quantity, hold.held);
      return [
        {
          line: hold.line,
          text: `${line.name}: apartado ${formatDecimal(hold.held)} de ${formatDecimal(line.quantity)} ${line.unit}`.trim(),
          missing: hold.complete ? null : `Falta ${left === null ? '' : `${formatDecimal(left)} `}${line.unit}`.trim(),
        },
      ];
    }
    if (line.kind === 'equipment') {
      const left = line.quantity - hold.assets.length;
      return [
        {
          line: hold.line,
          text: `${line.name}: ${hold.assets.length > 0 ? hold.assets.map((asset) => asset.code).join(', ') : 'ninguno apartado'}`,
          missing: hold.complete ? null : left > 0 ? missingEquipment(line.name, left) : 'Falta',
        },
      ];
    }
    return [];
  });
}
