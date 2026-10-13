import { type Position } from '@platlab/contracts';
import { Button, Quantity, Sheet, cn, formatDecimal, normalizeDecimalInput, type SelectOption } from '@platlab/ui';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode, type RefObject } from 'react';
import { type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { type z } from 'zod';
import { formatDate } from '../../../app/format';
import { fieldErrors } from '../commands';

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
  compact = false,
  status,
  initialFocus,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitLabel: string;
  pending: boolean;
  generalError: string | null;
  onSubmit: () => void;
  /** Cada hijo es una sección separada por una línea, como el modal de salida de ReactiLab. */
  sections?: boolean;
  /** Formulario largo por secciones (ADR 0015): ventana ancha y compacta, con su estado al pie. */
  compact?: boolean;
  /** Lo que falta o «Listo», junto a las acciones del pie de un formulario compacto. */
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
      wide={compact}
      compact={compact}
      initialFocus={initialFocus}
      footer={
        compact ? (
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
            <p role="status" className="min-w-0 basis-full text-[13px] font-medium text-ink-muted sm:flex-1 sm:basis-0">
              {status}
            </p>
            <Button variant="ghost" className="h-[44px] sm:h-10" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              loading={pending}
              className="h-[44px] rounded-control bg-linear-to-r from-action to-action-deep px-5 text-sm font-bold shadow-md shadow-action/20 hover:from-action-hover hover:to-action-deep max-sm:flex-1 sm:h-10"
            >
              {submitLabel}
            </Button>
          </div>
        ) : (
          <>
            <Button variant="ghost" className="h-12 shrink-0 rounded-2xl px-5" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              loading={pending}
              className="h-12 flex-1 rounded-2xl bg-linear-to-r from-action to-action-deep text-base font-bold shadow-lg shadow-action/25 hover:from-action-hover hover:to-action-deep"
            >
              {submitLabel}
            </Button>
          </>
        )
      }
    >
      <form
        id={formId}
        noValidate
        className={cn(
          // Una sola columna del ancho disponible: un nombre largo en un selector no ensancha la ventana.
          'grid grid-cols-1',
          // En el compacto cada sección trae su separación (aparecen a medida que se completa).
          sections ? 'divide-y divide-line [&>*]:py-4 [&>:first-child]:pt-0 [&>:last-child]:pb-0' : compact ? 'gap-0' : 'gap-5',
        )}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {generalError ? (
          <p role="alert" className={cn('rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger', compact && 'mb-4')}>
            {generalError}
          </p>
        ) : null}
        {children}
      </form>
    </Sheet>
  );
}

/** Texto «se registrará …» con la cantidad tal como la entenderá el servidor. */
export function QuantityPreview({ raw, unit, sign = '' }: { raw: string; unit: string | undefined; sign?: '' | '-' }) {
  const normalized = normalizeDecimalInput(raw);
  if (!unit || !/^\d{1,15}(\.\d{1,9})?$/.test(normalized) || /^0+(\.0+)?$/.test(normalized)) return null;
  return (
    <span>
      Se registrará <Quantity value={`${sign}${normalized}`} unit={unit} signed className="font-medium text-ink" />
    </span>
  );
}

export const expiryText = (position: Position) =>
  position.lot.expiresOn ? `caduca ${formatDate(position.lot.expiresOn)}` : 'caducidad sin confirmar';

/**
 * Frasco y ubicación, agrupados por reactivo, con saldo y caducidad como dato secundario
 * (ADR 0012): elegir un frasco es decidir cuál vence antes.
 */
export const positionOption = (position: Position): SelectOption => ({
  value: position.id,
  label: `${position.container?.code ?? position.lot.code} · ${position.location.name}`,
  detail: `${formatDecimal(position.balance)} ${position.unit} · ${expiryText(position)}`,
  group: position.product.name,
});

/** Orden FEFO dentro de cada reactivo: por nombre, luego por caducidad (desconocida al final). */
export const byProductThenExpiry = (a: Position, b: Position) =>
  a.product.name.localeCompare(b.product.name) ||
  (a.lot.expiresOn ?? '9999-12-31').localeCompare(b.lot.expiresOn ?? '9999-12-31') ||
  (a.container?.code ?? '').localeCompare(b.container?.code ?? '');

export const isExpired = (position: Position, today: string) => position.lot.expiresOn !== null && position.lot.expiresOn < today;
