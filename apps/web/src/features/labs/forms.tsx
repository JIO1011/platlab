import type { FormSummary } from '@platlab/contracts';
import { Badge, Button, IconChip, Skeleton, StatePanel } from '@platlab/ui';
import { ChevronRight, ClipboardList, FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatDayInZone } from '../../app/format';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useLabs } from './context';
import { NewFormSheet } from './form-new-sheet';
import { LeadDaysSection } from './lead-days';
import { ArchivedRows, ListCard, ListRows } from './list-card';
import { PeriodsSection } from './periods';
import { useLabsForms, useLabsSettings, usePeriods } from './queries';

/** Un formato en la lista: su ícono, nombre, el título que lleva la hoja y su última revisión. La fila entera abre su hoja. */
function FormRow({ form, workspaceId, timeZone }: { form: FormSummary; workspaceId: string; timeZone: string }) {
  return (
    <li>
      <Link
        to={`/e/${workspaceId}/laboratorios/formatos/${form.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-action-soft/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action sm:px-6"
      >
        <IconChip icon={FileText} tone="accent" className="rounded-xl" />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words text-[15px] font-bold tracking-tight text-ink">{form.name}</span>
            {form.archivedAt ? <Badge tone="neutral">Archivado</Badge> : null}
          </span>
          <span className="break-words text-sm text-ink">{form.title}</span>
          <span className="text-[13px] tabular-nums text-ink-muted">
            Revisión {form.revision} · Publicada el {formatDayInZone(form.publishedAt, timeZone)}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Formatos de Laboratorios (ADR 0023): en dos columnas desde `lg`, a la izquierda las plantillas de solicitud del espacio de
 * trabajo (cada una con su nombre y su última revisión; los archivados, plegados) y los períodos, y a la derecha la
 * anticipación del pedido. El Administrador crea formatos nuevos; quien llena solo ve los activos.
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
    <Button size="sm" className="h-11 sm:h-8" aria-haspopup="dialog" onClick={openSheet}>
      <Plus aria-hidden />
      Nuevo formato
    </Button>
  ) : undefined;

  return (
    <>
      <SectionHeader title="Formatos" updatedAt={Math.min(forms.dataUpdatedAt, settings.dataUpdatedAt, periods.dataUpdatedAt)} />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 gap-6">
          <ListCard title="Plantillas de solicitud" description="Formularios publicados para docentes y solicitantes externos" action={create}>
            {forms.isPending ? (
              <div aria-busy="true" className="border-t border-line p-5 sm:px-6">
                <Skeleton className="h-24 rounded-card" />
              </div>
            ) : forms.isError ? (
              <div className="border-t border-line">
                <QueryErrorState error={forms.error} onRetry={() => void forms.refetch()} />
              </div>
            ) : (
              <>
                {active.length === 0 ? (
                  <div className="border-t border-line">
                    <StatePanel
                      icon={ClipboardList}
                      title="Aún no hay formatos"
                      description={canManageForm ? 'Crea un formato a partir de la plantilla estándar para que se pueda llenar una solicitud.' : 'Quien administra el espacio crea los formatos de solicitud. Cuando existan, los verás aquí.'}
                      className="py-8"
                    />
                  </div>
                ) : (
                  <ListRows>
                    {active.map((form) => (
                      <FormRow key={form.id} form={form} workspaceId={workspaceId} timeZone={timeZone} />
                    ))}
                  </ListRows>
                )}
                {archived.length > 0 ? (
                  <ArchivedRows count={archived.length}>
                    {archived.map((form) => (
                      <FormRow key={form.id} form={form} workspaceId={workspaceId} timeZone={timeZone} />
                    ))}
                  </ArchivedRows>
                ) : null}
              </>
            )}
          </ListCard>
          <PeriodsSection workspaceId={workspaceId} periods={periods} timeZone={timeZone} canManage={canManageSpaces} />
        </div>
        <LeadDaysSection workspaceId={workspaceId} settings={settings} canManage={canManageSpaces} />
      </div>
      {sheet ? <NewFormSheet key={sheet.n} workspaceId={workspaceId} open={sheet.open} onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))} forms={items} /> : null}
    </>
  );
}
