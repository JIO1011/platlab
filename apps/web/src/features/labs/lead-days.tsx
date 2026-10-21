import { updateLabsSettingsRequest, type LabsSettings } from '@platlab/contracts';
import { Button, Field, Input, Skeleton, toast } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { QueryErrorState } from '../../app/states';
import { labsErrorMessage, useSaveSettings } from './commands';

/** Los días de anticipación como los escribió la persona: vacío o con letras, `NaN`, que el contrato rechaza. */
const daysOf = (text: string) => (text.trim() === '' ? Number.NaN : Number(text));

/**
 * La anticipación con que se solicita un espacio, la misma para todo el espacio de trabajo (0 a 90 días). Se guarda de
 * forma explícita, con su botón: escribirla no cambia nada hasta que el servidor confirma.
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
  const saved = settings.data?.leadDays;
  const text = draft ?? String(saved ?? '');
  const dirty = draft !== null && draft !== String(saved);

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
    <section aria-labelledby="labs-lead-days" className="grid gap-4">
      <h2 id="labs-lead-days" className="text-lg font-semibold text-ink">
        Anticipación
      </h2>
      <div className="rounded-card bg-surface px-4 py-4 shadow-raised sm:px-5">
        {settings.isPending ? (
          <Skeleton className="h-20" />
        ) : settings.isError ? (
          <QueryErrorState error={settings.error} onRetry={() => void settings.refetch()} />
        ) : canManage ? (
          <form
            className="flex flex-wrap items-end gap-x-4 gap-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field
              label="Días de anticipación"
              hint="Con cuántos días de antelación se pide un espacio. Vale para todas las áreas."
              error={error ?? undefined}
              className="min-w-0 flex-1 basis-64"
            >
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={90}
                className="h-11 w-32 tabular-nums sm:h-10"
                value={text}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
              />
            </Field>
            <Button type="submit" variant="primary" className="h-11 sm:h-10" disabled={!dirty} loading={save.isPending}>
              Guardar anticipación
            </Button>
          </form>
        ) : (
          <p className="text-sm text-ink">
            <span className="font-medium tabular-nums">{saved === 1 ? '1 día' : `${saved} días`}</span> de anticipación para solicitar un espacio.
          </p>
        )}
      </div>
    </section>
  );
}
