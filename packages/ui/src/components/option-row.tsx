import { Check } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

interface OptionRowProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'children'> {
  /** Casilla (varios valores) o botón de radio (uno solo). */
  type?: 'checkbox' | 'radio';
  children: ReactNode;
  /** Cuenta a la derecha, en cifras tabulares y tinta tenue (conteo de la opción). */
  count?: ReactNode;
}

/**
 * Fila de opción como la del filtro de Excel: toda la fila es la zona de pulsación. El control nativo
 * queda dentro (teclado y lectores de pantalla) y se dibuja la casilla con los tokens; 44 px de alto
 * por debajo de 640 px y 32 px en escritorio.
 */
export function OptionRow({ type = 'checkbox', children, count, ...props }: OptionRowProps) {
  return (
    <label className="relative flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-control px-2 py-1 text-sm text-ink transition-colors hover:bg-surface-sunken has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 sm:min-h-8">
      <input type={type} className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" {...props} />
      <span
        aria-hidden
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center border border-line-strong bg-surface text-on-action transition-colors duration-150',
          'peer-checked:border-action peer-checked:bg-action peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action',
          type === 'radio' ? 'rounded-full [&>svg]:hidden peer-checked:shadow-[inset_0_0_0_3px_var(--color-surface)]' : 'rounded-[5px] [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1 text-balance break-words">{children}</span>
      {count === undefined ? null : <span className="shrink-0 text-[13px] tabular-nums text-ink-subtle">{count}</span>}
    </label>
  );
}
