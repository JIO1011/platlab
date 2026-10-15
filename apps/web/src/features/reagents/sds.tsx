import type { ProductDetail } from '@platlab/contracts';
import { cn } from '@platlab/ui';
import { ExternalLink } from 'lucide-react';

type SdsKind = NonNullable<ProductDetail['sdsKind']>;

/** Cómo está la ficha de seguridad (ADR 0015), para el selector del ingreso y el texto de la ficha. */
export const sdsLabels: Record<SdsKind, string> = { digital: 'Digital', physical: 'Solo en físico', none: 'No tiene' };

/**
 * Ficha de seguridad de un reactivo (ADR 0015, 0016): si es digital, el enlace en una pestaña nueva;
 * si no, cómo está o que no se indicó. La muestran la cabecera de la ficha, el ingreso y la hoja de salida.
 */
export function SdsReference({
  kind,
  url,
  className,
}: {
  kind: ProductDetail['sdsKind'];
  url: string | null;
  className?: string;
}) {
  if (kind === 'digital' && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn('inline-flex items-center gap-1 font-medium text-action hover:text-action-hover', className)}
      >
        Ficha de seguridad
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <span className={className}>
      {kind ? `Ficha de seguridad: ${sdsLabels[kind].toLowerCase()}` : 'Ficha de seguridad sin indicar'}
    </span>
  );
}
