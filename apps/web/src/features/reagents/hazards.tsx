import type { hazard } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import type { z } from 'zod';
import { pillStyles } from './pills';

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
 * Selección múltiple de peligros: los nueve pictogramas, cada uno en una píldora con su nombre y una
 * casilla (para lectores y teclado); los elegidos, en índigo-50. Se guardan en el orden del SGA.
 */
export function HazardSelect({ value, onChange }: { value: Hazard[]; onChange: (next: Hazard[]) => void }) {
  const toggle = (id: Hazard) =>
    onChange(hazards.map((entry) => entry.id).filter((entry) => (entry === id ? !value.includes(id) : value.includes(entry))));
  return (
    <div className="flex flex-wrap gap-2">
      {hazards.map((entry) => {
        const checked = value.includes(entry.id);
        return (
          <label key={entry.id} className={cn(pillStyles(checked, 'auto'), 'gap-2 py-1 pl-1.5 pr-3')}>
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(entry.id)} />
            <Pictogram file={entry.file} />
            {entry.label}
          </label>
        );
      })}
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
