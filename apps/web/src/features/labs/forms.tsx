import type { FormSummary } from '@platlab/contracts';
import { Badge, Button, Skeleton, StatePanel } from '@platlab/ui';
import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatDayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useLabs } from './context';
import { NewFormSheet } from './form-new-sheet';
import { LeadDaysSection } from './lead-days';
import { PeriodsSection } from './periods';
import { useLabsForms, useLabsSettings, usePeriods } from './queries';

/** Un formato en la lista: su nombre, el título que lleva la hoja y su última revisión; abre su hoja. */
function FormCard({ form, workspaceId, timeZone }: { form: FormSummary; workspaceId: string; timeZone: string }) {
  return (
    <li>
      <Link
        to={`/e/${workspaceId}/laboratorios/formatos/${form.id}`}
        className="grid gap-1.5 rounded-card bg-surface px-4 py-4 shadow-raised transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action sm:px-5"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="break-words font-semibold text-ink">{form.name}</span>
          {form.archivedAt ? <Badge tone="neutral">Archivado</Badge> : null}
        </span>
        <span className="break-words text-sm text-ink">{form.title}</span>
        <span className="text-sm tabular-nums text-ink-muted">
          Revisión {form.revision} · publicada el {formatDayInZone(form.publishedAt, timeZone)}
        </span>
      </Link>
    </li>
  );
}

/**
 * Formatos de Laboratorios (ADR 0023): los formatos de solicitud del espacio de trabajo, cada uno con su nombre y su última
 * revisión; los archivados, aparte y plegados. El Administrador crea formatos nuevos; quien llena solo ve los activos.
 * Al pie, la anticipación del pedido y los períodos, que son reglas del pedido y las fija el Administrador.
 */
export function LabsFormsPage() {
  const { workspaceId, me, canManageForm, canManageSpaces } = useLabs();
  const forms = useLabsForms(workspaceId);
  const settings = useLabsSettings(workspaceId);
  const periods = usePeriods(workspaceId);
  /** La hoja «Nuevo formato»: `n` la monta de nuevo en cada apertura. */
  const [sheet, setSheet] = useState<{ n: number; open: boolean } | null>(null);
  const openSheet = () => setSheet({ n: (sheet?.n ?? 0) + 1, open: true });
  const items = forms.data?.items ?? [];
  const active = items.filter((form) => form.archivedAt === null);
  const archived = items.filter((form) => form.archivedAt !== null);
  const timeZone = me.workspace.timeZone;

  const create = canManageForm ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={openSheet}>
      <Plus aria-hidden />
      Nuevo formato
    </Button>
  ) : undefined;

  return (
    <>
      <SectionHeader title="Formatos" updatedAt={Math.min(forms.dataUpdatedAt, settings.dataUpdatedAt, periods.dataUpdatedAt)} actions={create} />
      <div className="mt-6 grid gap-8">
        <div className="grid gap-4">
          {forms.isPending ? (
            <div aria-busy="true">
              <Skeleton className="h-40 rounded-card" />
            </div>
          ) : forms.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={forms.error} onRetry={() => void forms.refetch()} />
            </div>
          ) : (
            <>
              {active.length === 0 ? (
                <div className="rounded-card bg-surface shadow-raised">
                  <StatePanel
                    icon={ClipboardList}
                    title="Aún no hay formatos"
                    description={canManageForm ? 'Crea un formato a partir de la plantilla estándar para que se pueda llenar una solicitud.' : 'Quien administra el espacio crea los formatos de solicitud. Cuando existan, los verás aquí.'}
                    action={
                      create ? (
                        <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={openSheet}>
                          <Plus aria-hidden />
                          Nuevo formato
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <ul className="grid gap-3 sm:gap-4">
                  {active.map((form) => (
                    <FormCard key={form.id} form={form} workspaceId={workspaceId} timeZone={timeZone} />
                  ))}
                </ul>
              )}
              {archived.length > 0 ? (
                <details>
                  <summary className="min-h-11 cursor-pointer list-none text-sm font-medium text-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action [&::-webkit-details-marker]:hidden">
                    Archivados ({archived.length})
                  </summary>
                  <ul className="mt-3 grid gap-3 sm:gap-4">
                    {archived.map((form) => (
                      <FormCard key={form.id} form={form} workspaceId={workspaceId} timeZone={timeZone} />
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}
        </div>
        <LeadDaysSection workspaceId={workspaceId} settings={settings} canManage={canManageSpaces} />
        <PeriodsSection workspaceId={workspaceId} periods={periods} timeZone={timeZone} canManage={canManageSpaces} />
      </div>
      {sheet ? <NewFormSheet key={sheet.n} workspaceId={workspaceId} open={sheet.open} onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))} forms={items} /> : null}
    </>
  );
}
