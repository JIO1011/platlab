import type { Asset } from '@platlab/contracts';
import { LabelBar } from '../../app/labels/label-bar';
import type { AssetPicks } from './asset-list';
import type { TypePicks } from './area-types';
import {
  dropTypes,
  dropUnits,
  isUnitPicked,
  pickTypes,
  pickUnits,
  selectionCount,
  toggleType,
  toggleUnit,
  typePicked,
  type LabelSelection,
  type PickUnit,
} from './label-selection';

/** El modo etiquetas del área (E-01d): si está activo, la elección y qué hacer con ella. */
export interface AreaLabels {
  /** El modo está activo: los cuadros giran y las filas muestran su casilla. */
  active: boolean;
  /** Ya se abrió una vez: el reverso se monta y se queda para poder girar de vuelta. */
  used: boolean;
  selection: LabelSelection;
  onChange: (selection: LabelSelection) => void;
  /** Cuántas unidades tiene un tipo con el filtro de estado actual. */
  totalOf: (typeId: string) => number;
  onDone: () => void;
  onPrint: () => void;
}

const unitOf = (asset: Asset): PickUnit => ({ id: asset.id, typeId: asset.type.id });

/** Lo que las unidades visibles necesitan del modo: nada hasta que se abre por primera vez. */
export function unitPicks(labels: AreaLabels): AssetPicks | undefined {
  if (!labels.used) return undefined;
  return {
    flipped: labels.active,
    picked: (asset) => isUnitPicked(labels.selection, unitOf(asset)),
    onPick: (asset) => labels.onChange(toggleUnit(labels.selection, unitOf(asset))),
  };
}

/** Lo que los tipos visibles necesitan del modo: nada hasta que se abre por primera vez. */
export function typePicks(labels: AreaLabels): TypePicks | undefined {
  if (!labels.used) return undefined;
  return {
    flipped: labels.active,
    count: (typeId, total) => typePicked(labels.selection, typeId, total),
    onPick: (typeId, total) => labels.onChange(toggleType(labels.selection, typeId, total)),
  };
}

/** Lo que se ve y «Todas» / «Ninguna» alcanzan: los tipos del área o las unidades cargadas. */
export type VisibleLabels = { kind: 'types'; items: Array<{ id: string; total: number }> } | { kind: 'units'; items: Asset[] };

/** La barra inferior del modo etiquetas, sobre lo que se ve. */
export function AreaLabelBar({ labels, visible }: { labels: AreaLabels; visible: VisibleLabels }) {
  const { selection, onChange } = labels;
  const units = visible.kind === 'units' ? visible.items.map(unitOf) : [];
  const allPicked =
    visible.items.length > 0 &&
    (visible.kind === 'types'
      ? visible.items.every((entry) => typePicked(selection, entry.id, entry.total) === entry.total)
      : units.every((unit) => isUnitPicked(selection, unit)));
  const toggleAll = () => {
    if (visible.kind === 'types') {
      const ids = visible.items.map((entry) => entry.id);
      onChange(allPicked ? dropTypes(selection, ids) : pickTypes(selection, ids));
    } else {
      onChange(allPicked ? dropUnits(selection, units) : pickUnits(selection, units));
    }
  };
  return (
    <LabelBar
      open={labels.active}
      count={selectionCount(selection, labels.totalOf)}
      allPicked={allPicked}
      onToggleAll={toggleAll}
      onDone={labels.onDone}
      onPrint={labels.onPrint}
    />
  );
}
