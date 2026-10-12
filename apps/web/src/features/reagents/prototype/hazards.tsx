// Prototipo R-01D: solo interfaz
import { cn } from '@platlab/ui';
import { Bomb, Check, Cylinder, Fish, Flame, FlameKindling, HeartPulse, Skull, TestTube, TriangleAlert, type LucideIcon } from 'lucide-react';

/**
 * Excepción de color: el rojo del borde del rombo es normativo del SGA (pictogramas de peligro),
 * no un color de estado ni de acento. El significado va siempre en el texto contiguo.
 */
const SGA_RED = '#e30613';

interface Hazard {
  id: string;
  label: string;
  /** Lucide no trae pictogramas SGA: se dibuja el rombo y se aproxima el símbolo con un icono. */
  icon: LucideIcon;
}

const hazards: Hazard[] = [
  { id: 'explosive', label: 'Explosivo', icon: Bomb },
  { id: 'flammable', label: 'Inflamable', icon: Flame },
  { id: 'oxidizer', label: 'Comburente', icon: FlameKindling },
  { id: 'gas', label: 'Gas a presión', icon: Cylinder },
  { id: 'corrosive', label: 'Corrosivo', icon: TestTube },
  { id: 'toxic', label: 'Toxicidad aguda', icon: Skull },
  { id: 'irritant', label: 'Irritante o nocivo', icon: TriangleAlert },
  { id: 'health', label: 'Peligro para la salud', icon: HeartPulse },
  { id: 'environment', label: 'Peligro para el medio ambiente', icon: Fish },
];

/** Rombo del SGA con su símbolo dentro; decorativo, el nombre va aparte. */
function Pictogram({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span aria-hidden className={cn('relative inline-flex size-9 shrink-0 items-center justify-center', className)}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
        <polygon points="20,2.5 37.5,20 20,37.5 2.5,20" fill="var(--color-surface)" stroke={SGA_RED} strokeWidth="3.2" strokeLinejoin="miter" />
      </svg>
      <Icon className="relative size-[18px] text-ink" strokeWidth={2} />
    </span>
  );
}

/** Selección múltiple de los nueve pictogramas; cada ficha dice su nombre y si está marcada. */
export function HazardPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {hazards.map((hazard) => {
        const pressed = value.includes(hazard.id);
        return (
          <button
            key={hazard.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => toggle(hazard.id)}
            className={cn(
              'relative flex min-h-[44px] items-center gap-2 rounded-control border px-2 py-1.5 text-left text-[13px] leading-tight transition-colors duration-150 ease-out-expo sm:min-h-12',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action',
              pressed ? 'border-action bg-action-soft font-semibold text-ink' : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-surface-sunken hover:text-ink',
            )}
          >
            <Pictogram icon={hazard.icon} />
            <span className="min-w-0 flex-1 text-balance">{hazard.label}</span>
            {pressed ? <Check className="size-4 shrink-0 text-action" strokeWidth={3} aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Los peligros ya registrados de un reactivo: rombo pequeño y nombre, en una línea que se parte. */
export function HazardTags({ ids }: { ids: string[] }) {
  if (ids.length === 0) return <span className="text-[13px] text-ink-muted">Sin peligros registrados</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {ids.map((id) => {
        const hazard = hazards.find((entry) => entry.id === id);
        return hazard ? (
          <li key={id} className="inline-flex items-center gap-1.5 text-[13px] text-ink">
            <Pictogram icon={hazard.icon} className="size-6 [&_svg:last-child]:size-3" />
            {hazard.label}
          </li>
        ) : null;
      })}
    </ul>
  );
}
