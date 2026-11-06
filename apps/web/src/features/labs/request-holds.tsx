import { Button } from '@platlab/ui';
import { PackageX, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { todayInZone } from '../../app/format';
import { useLabs } from './context';
import { PracticeActions } from './practice-actions';
import { isChangeable, stageLabels, stageTones } from './practice-stage';
import { PracticeSummary } from './practice-summary';
import { holdRows } from './request-hold-rows';
import type { RequestView } from './request-draft';
import { RequestPicksSheet } from './request-picks-sheet';
import { Pill } from './request-status';
import { shortDateText } from './schedule-placement';
import { softCard } from './style';

/**
 * Lo apartado en cada fecha programada (L-01d, ADR 0023), como una línea de tiempo: por fecha, el área, la hora y el
 * responsable de su bloque, con su estado en texto («Apartado» o «Falta apartar recursos»), y debajo lo apartado por
 * línea y, si no alcanza, «Falta». Quien programa (Administrador) puede «Cambiar frascos» de cada reactivo del catálogo
 * mientras el bloque no empieza. Cada bloque dice su etapa (L-01e) y quien lo lleva (`labs.schedule.lead`) lo prepara, lo
 * inicia, lo cierra y reporta incidencias desde aquí; cerrado, deja lo apartado, utilizado y devuelto. Va fuera de la hoja, como el historial: la hoja es lo que se imprime.
 */
export function RequestHolds({ request }: { request: RequestView }) {
  const { workspaceId, me, canSchedule, canLead } = useLabs();
  const blocks = request.blocks.filter((block) => block.holds.length > 0 || canLead);
  if (blocks.length === 0) return null;
  const today = todayInZone(me.workspace.timeZone);
  return (
    <section aria-label="Lo apartado" className={`${softCard} grid gap-4 p-5 sm:p-6 print:hidden`}>
      <h2 className="text-lg font-bold tracking-tight text-ink">Lo apartado</h2>
      <ul className="grid">
        {blocks.map((block) => {
          const rows = holdRows(request.lines, block);
          const short = rows.some((row) => row.missing !== null);
          return (
            <li key={block.activityId} className="relative grid gap-2.5 pb-7 pl-8 last:pb-0 before:absolute before:bottom-0 before:left-[5px] before:top-3 before:w-px before:bg-line-strong last:before:hidden">
              <span aria-hidden className={`absolute left-0 top-1.5 size-[11px] rounded-full ring-4 ring-surface ${short ? 'bg-warning' : 'bg-success'}`} />
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <span className="font-semibold text-ink">{shortDateText(block.date)}</span>
                <span className="break-words text-ink-muted tabular-nums">
                  {block.code} · {block.areaName} · {block.startsAt}–{block.endsAt} · {block.responsibleName}
                </span>
                <Pill tone={stageTones[block.stage]}>{stageLabels[block.stage]}</Pill>
                {short ? (
                  <Pill tone="warning" icon={<PackageX aria-hidden className="size-3.5" />}>
                    Falta apartar recursos
                  </Pill>
                ) : rows.length > 0 ? (
                  <Pill tone="success">Apartado</Pill>
                ) : null}
              </p>
              <ul className="grid gap-1.5">
                {rows.map((row) => {
                  const line = request.lines[row.line - 1];
                  return (
                    <li key={row.line} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
                      <span className="min-w-0 break-words tabular-nums">{row.text}</span>
                      {row.missing ? (
                        <Pill tone="warning" icon={<TriangleAlert aria-hidden className="size-3.5" />}>
                          {row.missing}
                        </Pill>
                      ) : null}
                      {canSchedule && isChangeable(block.stage) && line?.kind === 'reagent' && line.itemId ? (
                        <ChangePicks workspaceId={workspaceId} block={block} lineNumber={row.line} name={line.name} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {block.stage === 'closed' ? <PracticeSummary request={request} block={block} /> : null}
              {canLead ? <PracticeActions workspaceId={workspaceId} request={request} block={block} today={today} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** «Cambiar frascos» de un reactivo del bloque: el botón y su hoja, que se pide al abrirla. */
function ChangePicks({
  workspaceId,
  block,
  lineNumber,
  name,
}: {
  workspaceId: string;
  block: { activityId: string; version: number; date: string };
  lineNumber: number;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" aria-label={`Cambiar frascos de ${name}`} onClick={() => setOpen(true)}>
        Cambiar frascos
      </Button>
      <RequestPicksSheet workspaceId={workspaceId} open={open} onOpenChange={setOpen} block={block} lineNumber={lineNumber} name={name} />
    </>
  );
}
