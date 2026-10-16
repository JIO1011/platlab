import { Button, Sheet, cn } from '@platlab/ui';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode, type RefObject } from 'react';
import { type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { type z } from 'zod';
import { fieldErrors } from './commands';

export interface SheetBaseProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Valida con el contrato de la API y, si falla, marca cada campo con su motivo. */
export function validate<S extends z.ZodType, F extends FieldValues>(
  schema: S,
  payload: unknown,
  form: UseFormReturn<F>,
): z.infer<S> | null {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  for (const [field, message] of Object.entries(fieldErrors(parsed.error))) {
    form.setError(field as Path<F>, { message });
  }
  return null;
}

export function FormSheet({
  title,
  description,
  icon,
  open,
  onOpenChange,
  submitLabel,
  pending,
  generalError,
  onSubmit,
  sections = false,
  flush = false,
  wide = false,
  fullWidthSubmit = false,
  submitIcon: SubmitIcon,
  submitDisabled = false,
  submitLead,
  status,
  initialFocus,
  children,
}: {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitLabel: string;
  pending: boolean;
  generalError: string | null;
  onSubmit: () => void;
  /** Cada hijo es una banda separada por líneas de borde a borde, con `py-5`, como el modal de salida de ReactiLab. */
  sections?: boolean;
  /** Los hijos llegan de borde a borde y traen su propio relleno y sus líneas (el ingreso, con secciones que aparecen). */
  flush?: boolean;
  /** Ventana ancha (hasta 40 rem); `xl`, de dos columnas desde 1024 px (hasta 64 rem). */
  wide?: boolean | 'xl';
  /** El botón principal ocupa todo el ancho del pie y «Cancelar» sale (la cabecera cierra la hoja). */
  fullWidthSubmit?: boolean;
  /** Icono antes del texto del botón principal (con `fullWidthSubmit`). */
  submitIcon?: LucideIcon;
  /** Falta algo para poder enviar (p. ej., la cantidad): el botón queda pálido y deshabilitado. */
  submitDisabled?: boolean;
  /** Control unido al botón principal, a su izquierda y de su misma altura (con `fullWidthSubmit`): el número de frascos. */
  submitLead?: ReactNode;
  /** Lo que falta o «Listo», en una línea sobre el botón principal. */
  status?: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const formId = `form-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={icon}
      wide={wide}
      initialFocus={initialFocus}
      footer={
        <div className="grid w-full gap-3">
          {status ? (
            <p role="status" className="text-center text-[13px] font-medium text-ink-muted">
              {status}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            {fullWidthSubmit ? null : (
              <Button variant="ghost" className="h-12 shrink-0 rounded-2xl px-5" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            )}
            {fullWidthSubmit ? submitLead : null}
            <Button
              type="submit"
              form={formId}
              variant="primary"
              loading={pending}
              disabled={submitDisabled}
              className={cn(
                'w-full flex-1 rounded-2xl bg-linear-to-r from-action to-action-deep text-base font-bold shadow-lg shadow-action/25 hover:from-action-hover hover:to-action-deep disabled:shadow-none',
                fullWidthSubmit ? 'h-14 [&_svg]:size-5' : 'h-12',
              )}
            >
              {SubmitIcon ? <SubmitIcon aria-hidden /> : null}
              {submitLabel}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id={formId}
        noValidate
        className={cn(
          // Una sola columna del ancho disponible: un nombre largo en un selector no ensancha la ventana.
          'grid grid-cols-1',
          // Bandas de borde a borde: el formulario sale del relleno del cuerpo (-mx-6, -my-4) y cada banda lo repone.
          sections && '-mx-6 -my-4 divide-y divide-line [&>*]:px-6 [&>*]:py-5',
          flush && '-mx-6 -my-4',
          !sections && !flush && 'gap-5',
        )}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {generalError ? (
          <div className={cn(flush && 'px-6 pt-5')}>
            <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {generalError}
            </p>
          </div>
        ) : null}
        {children}
      </form>
    </Sheet>
  );
}
