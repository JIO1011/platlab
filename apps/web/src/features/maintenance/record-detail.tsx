import type { MaintenanceRecord, WorkspaceMeResponse } from '@platlab/contracts';
import { Badge, Button, Sheet, formatDecimal } from '@platlab/ui';
import { Ban, Check, ClipboardCheck, Minus, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatDate, formatDayInZone } from '../../app/format';
import { assetFichaPath, faultPath } from './asset-path';
import { formatFileSize } from './certificate-file';
import { doneText } from './due';
import { kindLabels, noPlanText, resultLabels } from './work-text';

export const resultTone = { pass: 'success', pass_with_observations: 'warning', fail: 'danger' } as const;

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

/**
 * El detalle de un mantenimiento completado, de solo lectura: un registro guardado no se edita (ADR 0020). Lo único
 * que admite es sumarle el certificado si no lo tiene. El Administrador puede corregirlo o anularlo (M-01b): un
 * registro anulado sigue a la vista, con quién, cuándo y por qué, y ya no admite nada.
 */
export function RecordDetail({
  record,
  me,
  workspaceId,
  open,
  onOpenChange,
  canAttach,
  onAttach,
  actions,
}: {
  record: MaintenanceRecord;
  me: WorkspaceMeResponse;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAttach: boolean;
  onAttach: () => void;
  /** «Corregir» y «Anular», solo para quien puede (Administrador); no se ofrecen en un registro anulado. */
  actions?: { onCorrect: () => void; onVoid: () => void };
}) {
  const timeZone = me.workspace.timeZone;
  const ficha = assetFichaPath(me, workspaceId, record.asset.id);
  const fault = record.faultId ? faultPath(me, workspaceId, record.faultId) : null;
  const { voided, corrects } = record;
  const assetText = (
    <>
      <span className="font-mono text-[13px] tabular-nums text-ink-muted">{record.asset.code}</span> {record.asset.name}
    </>
  );
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardCheck}
      wide
      fullscreenMobile
      title={record.plan?.title ?? noPlanText(record.kind)}
      description={`${record.asset.code} · ${formatDate(record.performedOn)}${voided ? ' · Anulado' : ''}`}
      footer={
        <div className="grid w-full gap-3">
          {actions && !voided ? (
            <div className="flex items-center gap-3">
              <Button className="h-12 flex-1 rounded-2xl" aria-haspopup="dialog" onClick={actions.onCorrect}>
                Corregir
              </Button>
              <Button className="h-12 flex-1 rounded-2xl font-semibold text-danger" aria-haspopup="dialog" onClick={actions.onVoid}>
                Anular
              </Button>
            </div>
          ) : null}
          <Button variant="primary" className="h-12 w-full rounded-2xl text-base font-bold" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      }
    >
      {voided || corrects ? (
        <div role="note" className="mb-5 grid gap-1.5 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
          {voided ? (
            <>
              <p className="flex items-start gap-2 font-semibold">
                <Ban className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 break-words">
                  Anulado el {formatDayInZone(voided.at, timeZone)} por {voided.by?.name ?? 'una persona que ya no es miembro'}.
                </span>
              </p>
              <p className="break-words pl-6">
                <span className="text-ink-muted">Motivo: </span>
                <span className="whitespace-pre-line">{voided.reason}</span>
              </p>
              {voided.correctedBy ? (
                <p className="pl-6 text-ink-muted">Corregido por el registro del {formatDate(voided.correctedBy.performedOn)}.</p>
              ) : null}
            </>
          ) : null}
          {corrects ? <p className={voided ? 'pl-6 text-ink-muted' : ''}>Corrige al registro del {formatDate(corrects.performedOn)}, anulado.</p> : null}
        </div>
      ) : null}
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Item label="Equipo">
          {ficha ? (
            <Link to={ficha} className="font-semibold text-action underline-offset-2 hover:underline">
              {assetText}
            </Link>
          ) : (
            assetText
          )}
        </Item>
        <Item label="Tipo de trabajo">
          {kindLabels[record.kind]}
          {record.plan || record.kind === 'corrective' ? null : <span className="text-ink-muted"> · sin plan</span>}
        </Item>
        {record.faultId ? (
          <Item label="Incidente">
            {fault ? (
              <Link to={fault} className="inline-flex min-h-11 items-center font-semibold text-action underline-offset-2 hover:underline sm:min-h-0">
                Atiende un incidente
              </Link>
            ) : (
              'Atiende un incidente'
            )}
          </Item>
        ) : null}
        <Item label="Fecha del trabajo">
          {formatDate(record.performedOn)}
          {record.dueOn ? <span className="block text-ink-muted">{doneText(record.dueOn, record.performedOn)}</span> : null}
        </Item>
        <Item label="Realizado por">{record.provider?.name ?? 'Interno'}</Item>
        <Item label="Resultado">
          <Badge tone={resultTone[record.result]}>
            {resultLabels[record.result]}
          </Badge>
        </Item>
        <Item label="Costo">{record.cost ? `$ ${formatDecimal(record.cost)}` : 'Sin dato'}</Item>
        {record.validUntil ? <Item label="Válida hasta">{formatDate(record.validUntil)}</Item> : null}
        {record.observations ? (
          <div className="min-w-0 sm:col-span-2">
            <Item label="Observaciones">
              <span className="whitespace-pre-line">{record.observations}</span>
            </Item>
          </div>
        ) : null}
        {record.acceptanceCriteria ? (
          <div className="min-w-0 sm:col-span-2">
            <Item label="Criterio de aceptación">
              <span className="whitespace-pre-line">{record.acceptanceCriteria}</span>
            </Item>
          </div>
        ) : null}
        {record.checklist.length > 0 ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-[13px] text-ink-muted">Lista de verificación</dt>
            <dd className="mt-1">
              <ul className="grid gap-1.5 text-sm text-ink">
                {record.checklist.map((entry, index) => (
                  <li key={`${index}-${entry.item}`} className="flex items-start gap-2">
                    {entry.done ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Minus className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
                    )}
                    <span className="min-w-0 break-words">
                      {entry.item}
                      <span className="text-ink-muted"> · {entry.done ? 'Hecho' : 'Sin marcar'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        <div className="min-w-0 sm:col-span-2">
          <Item label="Certificado">
            {record.certificate ? (
              <a
                href={record.certificate.url}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-action underline-offset-2 hover:underline sm:min-h-0"
              >
                <Paperclip className="size-4" aria-hidden />
                Ver certificado
                <span className="font-normal text-ink-muted">(PDF, {formatFileSize(record.certificate.byteSize)})</span>
              </a>
            ) : canAttach && !voided ? (
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-ink-muted">Sin certificado</span>
                <Button size="sm" className="max-sm:h-11" onClick={onAttach}>
                  Adjuntar certificado
                </Button>
              </span>
            ) : (
              <span className="text-ink-muted">Sin certificado</span>
            )}
          </Item>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <Item label="Registrado por">
            {record.recordedBy?.name ?? 'Una persona que ya no es miembro'}
            <span className="text-ink-muted"> · {formatDayInZone(record.recordedAt, timeZone)}</span>
          </Item>
        </div>
      </dl>
    </Sheet>
  );
}
