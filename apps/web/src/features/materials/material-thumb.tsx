import type { MaterialClass } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { PackageOpen, Repeat2 } from 'lucide-react';

const classIcons = { consumable: PackageOpen, reusable_counted: Repeat2 } as const;

/** Un tono estable por material, en pasteles lejos del rojo (que en la interfaz significa alerta). */
function tintOf(name: string): { background: string; color: string } {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  const hue = 40 + (hash % 280);
  return { background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 45% 36%)` };
}

/**
 * La imagen de un material (ADR 0025), para reconocerlo de un vistazo: su foto si la tiene y, si no, un mosaico del color
 * de su nombre con el icono de su clase. Decorativa: el nombre siempre va escrito al lado.
 */
export function MaterialThumb({ name, materialClass, photoUrl = null, className }: { name: string; materialClass: MaterialClass; photoUrl?: string | null; className?: string }) {
  const Icon = classIcons[materialClass];
  if (photoUrl) return <img src={photoUrl} alt="" className={cn('aspect-square shrink-0 rounded-2xl object-cover', className)} />;
  return (
    <span aria-hidden style={tintOf(name)} className={cn('inline-flex aspect-square shrink-0 items-center justify-center rounded-2xl [&>svg]:size-[45%]', className)}>
      <Icon />
    </span>
  );
}
