import { DndContext } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FORM_MAX_FREE_FIELDS } from '@platlab/contracts';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@platlab/ui';
import { Plus } from 'lucide-react';
import { useMediaQuery } from '../../app/use-media-query';
import { SYSTEM_LABELS, freeKeys, typeLabels, type DraftRow, type FormIssues } from './form-draft';
import { canAddFree, removeSection, removedOptional, renameField, renameSection, restoreSystemField, shiftField, shiftSection, updateFree } from './form-edit';
import { dataRowGrid, fieldTypes, sheetGrid, typeIcons } from './form-parts';
import { FieldDatum, RowShell, SectionBar } from './form-row-parts';
import { collide, instructions, useRowsEditor, verticalForRows } from './form-rows-drag';

/**
 * La Sección I en edición (ADR 0023): títulos de sección y filas de 1 a 3 datos. Cada dato se reordena y pasa de una fila a
 * otra arrastrando su asa (dnd kit), con Espacio y las flechas en ella, con Alt + flechas en su etiqueta o con los botones
 * de sus ajustes; soltarlo sobre otro dato lo pone en esa fila (si le caben) y soltarlo entre filas le da una propia.
 * «Agregar dato» y los datos del sistema que se vuelven a agregar nacen en una fila propia. Es un borrador en pantalla:
 * solo «Publicar revisión» lo guarda. Tras agregar, quitar o mover, el foco vuelve a un control que sigue existiendo.
 */
export function FormRowsEditor({ rows, issues, onChange }: { rows: DraftRow[]; issues: FormIssues; onChange: (rows: DraftRow[]) => void }) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { root, focusAfter, status, fields, sensors, announcements, apply, move, shiftRow, remove, dropped, add, addTitle, shiftTitle } = useRowsEditor(rows, onChange);
  const keys = freeKeys(rows);
  const addable = canAddFree(rows);
  const removed = removedOptional(rows);

  return (
    <section aria-label="Datos de la actividad" ref={root} className={sheetGrid}>
      <DndContext
        sensors={sensors}
        collisionDetection={collide}
        modifiers={[restrictToWindowEdges, verticalForRows]}
        accessibility={{ announcements, screenReaderInstructions: { draggable: instructions } }}
        onDragEnd={dropped}
      >
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row, index) => (
            <RowShell
              key={row.id}
              id={row.id}
              label={row.kind === 'section' ? `el título «${row.title.trim() || 'sin nombre'}»` : `la fila ${rows.slice(0, index + 1).filter((item) => item.kind === 'row').length}`}
              index={index}
              last={index === rows.length - 1}
              reduceMotion={reduceMotion}
            >
              {row.kind === 'section' ? (
                <SectionBar
                  row={row}
                  error={issues.sections[row.id]}
                  canUp={index > 0}
                  canDown={index < rows.length - 1}
                  onRename={(title) => onChange(renameSection(rows, row.id, title))}
                  onShift={(step) => shiftTitle(row.id, step)}
                  onRemove={() => apply(removeSection(rows, row.id), 'Se quitó el título de la sección.', 'add')}
                />
              ) : (
                <SortableContext items={row.fields.map((field) => field.id)} strategy={rectSortingStrategy}>
                  <div className={dataRowGrid(row.fields.length)}>
                    {row.fields.map((field) => (
                      <FieldDatum
                        key={field.id}
                        field={field}
                        number={fields.indexOf(field) + 1}
                        keyName={keys.get(field.id)}
                        problem={issues.fields[field.id]}
                        reduceMotion={reduceMotion}
                        canMove={(direction) => shiftField(rows, field.id, direction) !== undefined}
                        canShiftRow={(step) => shiftSection(rows, row.id, step) !== undefined}
                        onRename={(label) => onChange(renameField(rows, field.id, label))}
                        onUpdate={(patch) => onChange(updateFree(rows, field.id, patch))}
                        onMove={(direction, focus) => move(field.id, direction, focus)}
                        onShiftRow={(step, focus) => shiftRow(row.id, step, focus)}
                        onRemove={() => remove(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </RowShell>
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-white px-1 py-0.5 print:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-11 sm:h-6" data-focus="add" disabled={!addable}>
              <Plus aria-hidden />
              Agregar dato
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            aria-label="Tipo del dato nuevo"
            // El foco pasa a la etiqueta del dato nuevo; si no se eligió ninguno, vuelve al botón.
            onCloseAutoFocus={(event) => {
              if (focusAfter.current !== null) event.preventDefault();
            }}
          >
            {fieldTypes.map((type) => {
              const Icon = typeIcons[type];
              return (
                <DropdownMenuItem key={type} className="h-11 sm:h-10" onSelect={() => add(type)}>
                  <Icon aria-hidden />
                  {typeLabels[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button className="h-11 sm:h-6" onClick={addTitle}>
          <Plus aria-hidden />
          Agregar título de sección
        </Button>
        {removed.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-11 sm:h-6">
                <Plus aria-hidden />
                Datos del sistema
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              aria-label="Datos del sistema que se quitaron"
              onCloseAutoFocus={(event) => {
                if (focusAfter.current !== null) event.preventDefault();
              }}
            >
              {removed.map((key) => (
                <DropdownMenuItem
                  key={key}
                  className="h-11 sm:h-10"
                  onSelect={() => apply(restoreSystemField(rows, key), '', `label-${key}`)}
                >
                  {SYSTEM_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {!addable ? <p className="text-[12px] text-ink-muted">El formato admite hasta {FORM_MAX_FREE_FIELDS} datos libres.</p> : null}
        <p role="status" className="min-w-0 flex-1 text-[12px] text-ink-muted">
          {status}
        </p>
      </div>
    </section>
  );
}
