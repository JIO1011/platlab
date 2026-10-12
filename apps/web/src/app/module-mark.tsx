import { Boxes } from 'lucide-react';
import { webModule } from './modules';

/** Marca de agua de un módulo: su forma propia si la tiene, o su icono. */
export function ModuleMark({ code, className }: { code: string; className?: string }) {
  const descriptor = webModule(code);
  if (descriptor?.Mark) return <descriptor.Mark className={className} />;
  const Icon = descriptor?.Icon ?? Boxes;
  return <Icon className={className} aria-hidden />;
}
