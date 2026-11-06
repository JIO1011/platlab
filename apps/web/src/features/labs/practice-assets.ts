import type { LabsRequest } from '@platlab/contracts';

type Block = LabsRequest['blocks'][number];

/** Un equipo apartado en el bloque, con el nombre de la línea de la solicitud de la que sale. */
export interface BlockAsset {
  id: string;
  code: string;
  lineName: string;
}

/** Los equipos apartados en un bloque, en el orden de las líneas, para «Reportar incidencia» y para el «Código» impreso. */
export function blockAssets(lines: LabsRequest['lines'], block: Pick<Block, 'holds'>): BlockAsset[] {
  return block.holds.flatMap((hold) => {
    const line = lines[hold.line - 1];
    return line?.kind === 'equipment' ? hold.assets.map((asset) => ({ id: asset.id, code: asset.code, lineName: line.name })) : [];
  });
}

/** Los códigos de los equipos apartados de una línea de la solicitud en un bloque, separados por comas; vacío sin bloque. */
export function lineCodes(block: Pick<Block, 'holds'> | undefined, lineNumber: number): string {
  return block?.holds.find((hold) => hold.line === lineNumber)?.assets.map((asset) => asset.code).join(', ') ?? '';
}
