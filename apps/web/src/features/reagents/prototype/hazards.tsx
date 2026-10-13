// Prototipo R-01D: solo interfaz
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
import { Bomb, Check, Cylinder, Fish, Flame, FlameKindling, HeartPulse, Plus, Skull, TestTube, TriangleAlert, X, type LucideIcon } from 'lucide-react';

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
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full!">
        <polygon points="20,2.5 37.5,20 20,37.5 2.5,20" fill="var(--color-surface)" stroke={SGA_RED} strokeWidth="3.2" strokeLinejoin="miter" />
      </svg>
      <Icon className="relative size-[18px] text-ink" strokeWidth={2} />
    </span>
  );
}

/**
 * Selección múltiple de peligros: los elegidos se ven como pictogramas pequeños con su nombre (un
 * toque los quita) y «Añadir» abre un menú con los nueve, cada uno con su casilla.
 */
export function HazardSelect({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hazards
        .filter((hazard) => value.includes(hazard.id))
        .map((hazard) => (
          <button
            key={hazard.id}
            type="button"
            onClick={() => toggle(hazard.id)}
            aria-label={`Quitar ${hazard.label}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-surface-sunken py-1 pl-1.5 pr-2.5 text-[13px] text-ink transition-colors duration-150 hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:min-h-[36px]"
          >
            <Pictogram icon={hazard.icon} className="size-5 [&_svg:last-child]:size-2.5" />
            {hazard.label}
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
          {hazards.map((hazard) => {
            const checked = value.includes(hazard.id);
            return (
              <DropdownMenuItem
                key={hazard.id}
                role="menuitemcheckbox"
                aria-checked={checked}
                onSelect={(event) => {
                  event.preventDefault();
                  toggle(hazard.id);
                }}
                className="max-sm:h-[44px]"
              >
                <span
                  aria-hidden
                  className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border', checked ? 'border-action bg-action' : 'border-line-strong bg-surface')}
                >
                  {checked ? <Check className="size-3! text-on-action!" strokeWidth={3} /> : null}
                </span>
                <Pictogram icon={hazard.icon} className="size-5 [&_svg:last-child]:size-2.5" />
                <span className="text-ink">{hazard.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Pictogramas pequeños en fila (resultados de búsqueda, vista previa); los nombres van en texto para lectores. */
export function HazardGlyphs({ ids, className }: { ids: string[]; className?: string }) {
  const found = hazards.filter((hazard) => ids.includes(hazard.id));
  if (found.length === 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={found.map((hazard) => hazard.label).join(', ')}>
      {found.map((hazard) => (
        <Pictogram key={hazard.id} icon={hazard.icon} className="size-5 [&_svg:last-child]:size-2.5" />
      ))}
      <span className="sr-only">Peligros: {found.map((hazard) => hazard.label).join(', ')}</span>
    </span>
  );
}
