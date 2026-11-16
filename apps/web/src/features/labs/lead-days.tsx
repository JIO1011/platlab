import { updateLabsSettingsRequest, type LabsSettings } from '@platlab/contracts';
import { Button, Field, IconChip, Input, Skeleton, cn, toast } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Clock, Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { countText } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useSaveSettings } from './commands';
import { softCard } from './style';

const maxDays = 90;

/** Los días de anticipación como los escribió la persona: vacío o con letras, `NaN`, que el contrato rechaza. */
const daysOf = (text: string) => (text.trim() === '' ? Number.NaN : Number(text));

/** Un día más o menos, entre 0 y 90; si lo escrito no es un entero, parte del valor guardado. */
const stepDays = (text: string, delta: number, saved: number): string => {
  const typed = daysOf(text);
  return String(Math.min(maxDays, Math.max(0, (Number.isInteger(typed) ? typed : saved) + delta)));
};

/** La regla en una frase, con los días ya guardados: lo que aún no se guarda no rige. */
function LeadRule({ id, days }: { id: string; days: number }) {
  return (
    <p id={id} className="border-t border-line pt-3 text-[13px] leading-relaxed text-ink-muted">
      Con <span className="font-semibold text-ink tabular-nums">{countText(days, 'día', 'días')}</span>, una solicitud que ingrese fuera de este margen se marcará como{' '}
      <span className="font-medium text-danger">Fuera de plazo</span>.
    </p>
  );
}

/**
 * La anticipación con que se solicita un espacio, la misma para todo el espacio de trabajo (0 a 90 días). Se guarda de
 * forma explícita, con su botón: escribirla o sumarla con − y + no cambia nada hasta que el servidor confirma. Quien no
 * administra solo la lee.
 */
export function LeadDaysSection({
  workspaceId,
  settings,
  canManage,
}: {
  workspaceId: string;
  settings: UseQueryResult<LabsSettings>;
  canManage: boolean;
}) {
  const save = useSaveSettings(workspaceId);
  // Sin edición en curso (`null`), el campo sigue al valor confirmado; guardado, vuelve a seguirlo.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hintId = useId();
  const saved = settings.data?.leadDays;
  const text = draft ?? String(saved ?? '');
  const dirty = draft !== null && draft !== String(saved);
  const typed = daysOf(text);

  const edit = (value: string) => {
    setDraft(value);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const parsed = updateLabsSettingsRequest.safeParse({ leadDays: daysOf(text) });
    if (!parsed.success) {
      setError('Escribe un número entero de 0 a 90 días.');
      return;
    }
    try {
      await save.mutateAsync(parsed.data);
      setDraft(null);
      toast.success('Anticipación guardada', { description: parsed.data.leadDays === 1 ? '1 día' : `${parsed.data.leadDays} días` });
    } catch (failure) {
      setError(labsErrorMessage(failure));
    }
  };

  return (
    <section aria-labelledby="labs-lead-days" className={cn(softCard, 'grid min-w-0 gap-4 p-5 sm:p-6')}>
      <div className="flex items-start gap-3">
        <IconChip icon={Clock} tone="accent" className="rounded-xl" />
        <div className="min-w-0">
          <h2 id="labs-lead-days" className="text-lg font-bold tracking-tight text-ink">
            Anticipación
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">Con cuántos días de antelación se pide un espacio. Aplica para todas las áreas.</p>
        </div>
      </div>
      {settings.isPending ? (
        <Skeleton className="h-20" />
      ) : settings.isError ? (
        <QueryErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      ) : canManage ? (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field label="Días de anticipación" error={error ?? undefined}>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="icon" className="size-11 sm:size-10" aria-label="Un día menos" disabled={!(typed > 0)} onClick={() => edit(stepDays(text, -1, settings.data.leadDays))}>
                  <Minus aria-hidden />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={maxDays}
                  className="h-11 w-16 text-center tabular-nums [appearance:textfield] sm:h-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  // La regla va bajo la fila para que el botón quede junto al campo; con error, Field describe el error.
                  {...(error ? {} : { 'aria-describedby': hintId })}
                  value={text}
                  onChange={(event) => edit(event.target.value)}
                />
                <Button size="icon" className="size-11 sm:size-10" aria-label="Un día más" disabled={typed >= maxDays} onClick={() => edit(stepDays(text, 1, settings.data.leadDays))}>
                  <Plus aria-hidden />
                </Button>
                <Button type="submit" variant="primary" className="h-11 min-w-40 flex-1 sm:h-10" disabled={!dirty} loading={save.isPending}>
                  Guardar anticipación
                </Button>
              </div>
            </Field>
          </form>
          <LeadRule id={hintId} days={settings.data.leadDays} />
        </>
      ) : (
        <>
          <p className="text-sm text-ink">
            <span className="font-medium tabular-nums">{countText(settings.data.leadDays, 'día', 'días')}</span> de anticipación para solicitar un espacio.
          </p>
          <LeadRule id={hintId} days={settings.data.leadDays} />
        </>
      )}
    </section>
  );
}
