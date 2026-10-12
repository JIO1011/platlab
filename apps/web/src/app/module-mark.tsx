import { Boxes } from 'lucide-react';
import { moduleIcons } from './app-shell';

/**
 * Matraz sólido para las marcas de agua de Reactivos. El icono de trazo, agrandado, se ve como un
 * boceto; esta silueta rellena (cuerpo, líquido y burbujas en capas de opacidad) se lee como una
 * forma. Toma el color de `currentColor`; es decorativa.
 */
function FlaskMark({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 120 150" fill="currentColor" className={className} aria-hidden focusable="false">
      <rect x="36" y="2" width="48" height="11" rx="5.5" />
      <path fillOpacity="0.45" d="M45 13h30v37l38.4 73.2c5 9.6-1.9 21.3-12.7 21.3H19.3c-10.8 0-17.7-11.7-12.7-21.3L45 50V13z" />
      <path d="M23.4 88h73.2l16.8 35.2c5 9.6-1.9 21.3-12.7 21.3H19.3c-10.8 0-17.7-11.7-12.7-21.3L23.4 88z" />
      <circle cx="52" cy="72" r="5" fillOpacity="0.7" />
      <circle cx="68" cy="60" r="3.5" fillOpacity="0.6" />
      <circle cx="61" cy="40" r="2.5" fillOpacity="0.5" />
    </svg>
  );
}

/** Marca de agua de un módulo: su forma propia si la tiene, o su icono. */
export function ModuleMark({ code, className }: { code: string; className?: string }) {
  if (code === 'reagents') return <FlaskMark className={className} />;
  const Icon = moduleIcons[code] ?? Boxes;
  return <Icon className={className} aria-hidden />;
}
