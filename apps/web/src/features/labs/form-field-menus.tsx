import { Button, Field, OptionRow, Popover, PopoverContent, PopoverTrigger, Textarea, cn } from '@platlab/ui';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lock, Move, SlidersHorizontal } from 'lucide-react';
import { isEssential, typeLabels, type DraftField, type FormIssues } from './form-draft';
import type { Direction, updateFree } from './form-edit';
import { fieldTypes, typeIcons } from './form-parts';

/** Los controles de edición miden 44 px en el móvil; en escritorio, 24 px para no ensanchar la fila de la hoja. */
export const iconButton = 'size-11 sm:size-6';

const directions: Array<{ direction: Direction; label: string; Icon: typeof ArrowUp }> = [
  { direction: 'up', label: 'Subir', Icon: ArrowUp },
  { direction: 'down', label: 'Bajar', Icon: ArrowDown },
  { direction: 'left', label: 'A la izquierda', Icon: ArrowLeft },
  { direction: 'right', label: 'A la derecha', Icon: ArrowRight },
];

/** Lo que dice el candado de un dato esencial, como texto accesible y como ayuda al pasar el puntero. */
export const ESSENTIAL_NOTE = 'No se quita: lo usan el Cronograma y el aforo';

export interface FieldProps {
  field: DraftField;
  number: number;
  keyName: string | undefined;
  problem: FormIssues['fields'][string] | undefined;
  reduceMotion: boolean;
  canMove: (direction: Direction) => boolean;
  canShiftRow: (step: -1 | 1) => boolean;
  onRename: (label: string) => void;
  onUpdate: (patch: Parameters<typeof updateFree>[2]) => void;
  onMove: (direction: Direction, focus: string) => void;
  onShiftRow: (step: -1 | 1, focus: string) => void;
  onRemove: () => void;
}

/** Los ajustes de un dato en un popover: tipo, opciones y obligatorio si es libre; de un dato del sistema, qué se puede hacer con él. */
export function FieldSettings({ field, number, keyName, problem, onUpdate }: Pick<FieldProps, 'field' | 'number' | 'keyName' | 'problem' | 'onUpdate'>) {
  const name = field.label.trim() || `${number}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(iconButton, problem?.options && 'text-danger')} aria-label={`Ajustes del dato ${name}`}>
          <SlidersHorizontal aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-80 gap-3 p-3">
        {field.kind === 'free' ? (
          <>
            <fieldset className="grid gap-0.5">
              <legend className="mb-1 text-sm font-medium text-ink">Tipo de dato</legend>
              {fieldTypes.map((type) => {
                const Icon = typeIcons[type];
                return (
                  <OptionRow key={type} type="radio" name={`type-${field.id}`} checked={field.type === type} onChange={() => onUpdate({ type })}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-ink-muted" aria-hidden />
                      {typeLabels[type]}
                    </span>
                  </OptionRow>
                );
              })}
            </fieldset>
            {field.type === 'list' ? (
              <Field label="Opciones" required error={problem?.options} hint="Una por línea, sin repetirse.">
                <Textarea rows={4} value={field.options} onChange={(event) => onUpdate({ options: event.target.value })} />
              </Field>
            ) : null}
            <OptionRow checked={field.required} onChange={(event) => onUpdate({ required: event.target.checked })}>
              Obligatorio
            </OptionRow>
            <p className="px-2 text-[13px] text-ink-muted">
              Clave de la respuesta: <code className="font-mono text-ink">{keyName}</code>
            </p>
          </>
        ) : (
          <p className="flex items-start gap-2 px-2 text-[13px] text-ink-muted">
            {isEssential(field) ? <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : null}
            {isEssential(field) ? `${ESSENTIAL_NOTE}. Puedes renombrarlo y moverlo.` : 'Dato del sistema: se renombra y se mueve, y conserva su clave en todos los formatos. Puedes quitarlo y volver a agregarlo.'}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** «Mover» con botones, para quien no arrastra: el dato un paso en cada dirección y, aparte, la fila entera arriba o abajo. */
export function MoveMenu({ field, name, canMove, canShiftRow, onMove, onShiftRow }: { field: DraftField; name: string } & Pick<FieldProps, 'canMove' | 'canShiftRow' | 'onMove' | 'onShiftRow'>) {
  const focus = `move-menu-${field.id}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={iconButton} data-focus={focus} aria-label={`Mover el dato ${name} con botones`}>
          <Move aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-64 gap-2 p-3">
        <p className="text-sm font-medium text-ink">Mover «{name}»</p>
        <div className="grid grid-cols-2 gap-1">
          {directions.map(({ direction, label, Icon }) => (
            <Button key={direction} variant="secondary" className="h-11 justify-start sm:h-9" aria-label={`${label}: ${name}`} disabled={!canMove(direction)} onClick={() => onMove(direction, focus)}>
              <Icon aria-hidden />
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 border-t border-line pt-2">
          {([-1, 1] as const).map((step) => (
            <Button key={step} variant="secondary" className="h-11 justify-start sm:h-9" disabled={!canShiftRow(step)} onClick={() => onShiftRow(step, focus)}>
              {step < 0 ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
              {step < 0 ? 'Subir la fila' : 'Bajar la fila'}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
