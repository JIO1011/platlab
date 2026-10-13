import type { hazard } from '@platlab/contracts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
import { Check, Plus, X } from 'lucide-react';
import type { z } from 'zod';

export type Hazard = z.infer<typeof hazard>;

/**
 * Los nueve pictogramas oficiales del SGA (ADR 0015), en su orden. Son los SVG de la ONU (dominio
 * público) minificados en `public/ghs/`; el rojo del borde es normativo y no un color de estado.
 * Se sirven con `<img>`, nunca en línea. El significado va siempre en el texto contiguo.
 */
const hazards: ReadonlyArray<{ id: Hazard; label: string; file: string }> = [
  { id: 'GHS01', label: 'Explosivo', file: 'ghs01.svg' },
  { id: 'GHS02', label: 'Inflamable', file: 'ghs02.svg' },
  { id: 'GHS03', label: 'Comburente', file: 'ghs03.svg' },
  { id: 'GHS04', label: 'Gas a presión', file: 'ghs04.svg' },
  { id: 'GHS05', label: 'Corrosivo', file: 'ghs05.svg' },
  { id: 'GHS06', label: 'Toxicidad aguda', file: 'ghs06.svg' },
  { id: 'GHS07', label: 'Irritante o nocivo', file: 'ghs07.svg' },
  { id: 'GHS08', label: 'Peligro para la salud', file: 'ghs08.svg' },
  { id: 'GHS09', label: 'Peligro para el medio ambiente', file: 'ghs09.svg' },
];

/** Pictograma oficial. `alt` vacío cuando el nombre ya está en el texto contiguo. */
function Pictogram({ file, alt = '', className }: { file: string; alt?: string; className?: string | undefined }) {
  return <img src={`${import.meta.env.BASE_URL}ghs/${file}`} alt={alt} draggable={false} className={cn('size-6 shrink-0 select-none', className)} />;
}

/**
 * Selección múltiple de peligros: los elegidos se ven como pictogramas con su nombre (un toque los
 * quita) y «Añadir» abre un menú con los nueve, cada uno con su casilla.
 */
export function HazardSelect({ value, onChange }: { value: Hazard[]; onChange: (next: Hazard[]) => void }) {
  // Se guardan en el orden del SGA, como los muestra la ficha.
  const toggle = (id: Hazard) =>
    onChange(hazards.map((entry) => entry.id).filter((entry) => (entry === id ? !value.includes(id) : value.includes(entry))));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hazards
        .filter((entry) => value.includes(entry.id))
        .map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => toggle(entry.id)}
            aria-label={`Quitar ${entry.label}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface-sunken py-1 pl-1 pr-2.5 text-[13px] text-ink transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-[36px]"
          >
            <Pictogram file={entry.file} />
            {entry.label}
            <X className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          </button>
        ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-dashed border-line-strong px-3 text-[13px] font-medium text-action transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-[36px]"
          >
            <Plus className="size-3.5" aria-hidden />
            Añadir
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] min-w-64 overflow-y-auto">
          {hazards.map((entry) => {
            const checked = value.includes(entry.id);
            return (
              <DropdownMenuItem
                key={entry.id}
                role="menuitemcheckbox"
                aria-checked={checked}
                onSelect={(event) => {
                  event.preventDefault();
                  toggle(entry.id);
                }}
                className="max-sm:h-[44px]"
              >
                <span
                  aria-hidden
                  className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border', checked ? 'border-action bg-action' : 'border-line-strong bg-surface')}
                >
                  {checked ? <Check className="size-3! text-on-action!" strokeWidth={3} /> : null}
                </span>
                <Pictogram file={entry.file} />
                <span className="text-ink">{entry.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Pictogramas en fila; los nombres van en texto para lectores y en el `title`. `large` en la ficha. */
export function HazardGlyphs({ ids, large = false, className }: { ids: readonly Hazard[]; large?: boolean; className?: string }) {
  const found = hazards.filter((entry) => ids.includes(entry.id));
  if (found.length === 0) return null;
  const names = found.map((entry) => entry.label).join(', ');
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)} title={names}>
      {found.map((entry) => (
        <Pictogram key={entry.id} file={entry.file} alt={entry.label} className={large ? 'size-9' : undefined} />
      ))}
    </span>
  );
}
