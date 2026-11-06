import type { ReactNode } from 'react';
import type { DraftField, DraftRow, SystemKey } from './form-draft';
import { Cell, Datum, FieldSummary, Ghost, dataRowGrid, sheetGrid } from './form-parts';

/** Lo que se ve en el valor de un dato del sistema, en gris, como ejemplo de lo que llenará el sistema o el docente. */
const SYSTEM_EXAMPLES: Record<SystemKey, string> = {
  titulo: 'Nombre de la práctica o del trabajo',
  docente: 'Nombre del docente',
  tipo: 'Se elige de una lista',
  asignatura: 'Se elige de una lista',
  carrera: 'Se elige de una lista',
  fecha: 'Una o varias fechas',
  horario: '17:00 - 20:00',
  participantes: '10',
  grupos: '1',
};

export function FieldValue({ field }: { field: DraftField }) {
  return field.kind === 'system' ? <Ghost>{SYSTEM_EXAMPLES[field.key]}</Ghost> : <FieldSummary field={field} />;
}

/** El título de una sección: en la hoja de solo lectura, como la barra de color; el editor lo hace editable. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Cell kind="head" dense>
      <h2>{children.trim() || 'Sección sin título'}</h2>
    </Cell>
  );
}

/**
 * La Sección I de solo lectura: la que se imprime y la que ve quien no edita el formato. `renderValue` pone en el valor de
 * cada dato lo que se llena o se revisó; sin él, el ejemplo en gris.
 */
export function SheetRows({ rows, renderValue }: { rows: readonly DraftRow[]; renderValue?: (field: DraftField) => ReactNode }) {
  return (
    <section aria-label="Datos de la actividad" className={sheetGrid}>
      {rows.map((row) =>
        row.kind === 'section' ? (
          <SectionTitle key={row.id}>{row.title}</SectionTitle>
        ) : (
          <div key={row.id} className={dataRowGrid(row.fields.length)}>
            {row.fields.map((field) => (
              <Datum key={field.id} label={field.label.trim() || 'Sin etiqueta'} value={renderValue ? renderValue(field) : <FieldValue field={field} />} />
            ))}
          </div>
        ),
      )}
    </section>
  );
}
