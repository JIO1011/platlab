import { Badge, Button, Skeleton } from '@platlab/ui';
import { ClipboardCheck } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatDate } from '../../app/format';
import { useWorkspaceMe } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { dueText, dueTone, todayInZone } from './due';
import { DueDot, shortDue, toneText } from './due-view';
import { useAssetMaintenance } from './queries';
import { kindLabels, maintenancePath, resultLabels } from './work-text';

/** La hoja de registro se descarga al abrirla: la ficha y la tabla de equipos no cargan el escáner ni el formulario. */
const RecordSheet = lazy(async () => ({ default: (await import('./record-sheet')).RecordSheet }));

const resultTone = { pass: 'success', pass_with_observations: 'warning', fail: 'danger' } as const;

/**
 * La pestaña Mantenimiento de la ficha del equipo (ADR 0020): una fila por plan («Calibración · 12 nov», con su semáforo y
 * «Registrar»), sus excepciones con el motivo y sus últimos registros, con «Ver todo» hacia el Historial del equipo.
 * «Registrar» abre la hoja aquí mismo, con el equipo (y el plan) ya elegidos.
 */
export function AssetMaintenanceTab({ assetId }: { assetId: string }) {
  const { workspaceId = '' } = useParams();
  const me = useWorkspaceMe(workspaceId);
  const maintenance = useAssetMaintenance(workspaceId, assetId);
  // `n` monta la hoja de nuevo en cada apertura: formulario limpio y clave idempotente nueva.
  const [sheet, setSheet] = useState<{ n: number; open: boolean; planId?: string } | null>(null);
  if (maintenance.isPending || !me.data) return <Skeleton className="h-40" />;
  if (maintenance.isError) return <QueryErrorState error={maintenance.error} onRetry={() => void maintenance.refetch()} />;

  const { plans, exclusions, records, asset } = maintenance.data;
  const today = todayInZone(me.data.workspace.timeZone, Date.now());
  const base = maintenancePath(me.data.modules, workspaceId);
  const canRecord = me.data.permissions.includes('maintenance.work.record') && asset.condition !== 'retired';

  return (
    <div className="grid gap-5">
      <section aria-labelledby="mantenimiento-planes" className="rounded-card bg-surface shadow-raised">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <h2 id="mantenimiento-planes" className="text-sm font-bold text-ink">
            Planes de mantenimiento
          </h2>
          {canRecord && plans.length === 0 ? (
            <Button variant="primary" aria-haspopup="dialog" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => setSheet({ n: (sheet?.n ?? 0) + 1, open: true })}>
              <ClipboardCheck aria-hidden />
              Registrar
            </Button>
          ) : null}
        </div>
        {plans.length === 0 ? (
          <p className="px-5 py-5 text-sm text-ink-muted md:px-6">
            <span className="font-semibold text-ink">Sin plan de mantenimiento.</span> Este equipo no está en ningún plan, así que no genera trabajos por hacer.
            {canRecord ? ' Aun así puedes registrar un mantenimiento.' : ''}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {plans.map((entry) => {
              const tone = dueTone(entry, today);
              const failed = entry.lastResult === 'fail';
              return (
                <li key={entry.plan.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 md:px-6">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex items-start gap-2 break-words font-semibold text-ink">
                      <DueDot tone={tone} className="mt-[7px]" />
                      <span>
                        {kindLabels[entry.plan.kind]} · <span className="tabular-nums">{shortDue(entry.dueOn, today)}</span>
                      </span>
                    </p>
                    <p className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-[13px] font-medium ${toneText[tone]}`}>
                      {failed ? <Badge tone="danger">No conforme</Badge> : null}
                      {dueText(entry.dueOn, today)}
                      <span className="font-normal text-ink-muted">· {entry.plan.title}</span>
                    </p>
                  </div>
                  {canRecord ? (
                    <Button
                      className="h-11 w-full sm:h-9 sm:w-auto"
                      aria-haspopup="dialog"
                      aria-label={`Registrar: ${entry.plan.title}`}
                      onClick={() => setSheet({ n: (sheet?.n ?? 0) + 1, open: true, planId: entry.plan.id })}
                    >
                      Registrar
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {exclusions.length > 0 ? (
          <ul className="grid gap-1 border-t border-line px-5 py-3 text-[13px] text-ink-muted md:px-6" aria-label="Excepciones">
            {exclusions.map((entry) => (
              <li key={entry.plan.id}>
                <span className="font-medium text-ink">Excluido de {entry.plan.title}.</span> Motivo: {entry.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="mantenimiento-registros" className="rounded-card bg-surface shadow-raised">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 md:px-6">
          <h2 id="mantenimiento-registros" className="text-sm font-bold text-ink">
            Últimos registros
          </h2>
          {records.length > 0 ? (
            <Link
              to={`${base}/historial?${new URLSearchParams({ equipo: assetId })}`}
              className="-my-2 inline-flex min-h-11 items-center text-sm font-semibold text-action underline-offset-2 hover:underline sm:min-h-8"
            >
              Ver todo
            </Link>
          ) : null}
        </div>
        {records.length === 0 ? (
          <p className="px-5 py-5 text-sm text-ink-muted md:px-6">Aún no hay mantenimientos registrados para este equipo.</p>
        ) : (
          <ul className="divide-y divide-line">
            {records.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 md:px-6">
                <span className="w-28 text-sm tabular-nums text-ink-muted">{formatDate(entry.performedOn)}</span>
                <span className="min-w-0 flex-1 basis-40 break-words text-sm text-ink">
                  {entry.plan?.title ?? `${kindLabels[entry.kind]} sin plan`}
                  <span className="text-[13px] text-ink-muted"> · {entry.provider?.name ?? 'Interno'}</span>
                </span>
                <Badge tone={resultTone[entry.result]}>{resultLabels[entry.result]}</Badge>
                {entry.certificate ? (
                  <a
                    href={entry.certificate.url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-action underline-offset-2 hover:underline sm:min-h-8"
                  >
                    Ver certificado
                    <span className="sr-only"> (PDF, se abre en otra pestaña)</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheet ? (
        <Suspense fallback={null}>
          <RecordSheet
            key={sheet.n}
            workspaceId={workspaceId}
            me={me.data}
            open={sheet.open}
            onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
            assetId={assetId}
            {...(sheet.planId ? { planId: sheet.planId } : {})}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
