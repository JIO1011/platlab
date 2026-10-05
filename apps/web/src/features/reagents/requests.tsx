import { movementResponse, rejectIssueRequest, releasedRequest, type IssueRequestItem } from '@platlab/contracts';
import { Badge, Button, Field, Quantity, Skeleton, StatePanel, Textarea, cn, formatDecimal, toast } from '@platlab/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Inbox, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isApiError } from '../../app/api';
import { formatDateTime } from '../../app/format';
import { useReagentsKey } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { commandErrorMessage, useCommand } from './commands';
import { useReagents } from './context';

const statusBadge: Record<IssueRequestItem['status'], { tone: 'warning' | 'success' | 'danger' | 'neutral'; text: string }> = {
  // Pendiente es un estado como los demás: en «Todas» se dice con texto, no solo con un botón.
  pending: { tone: 'warning', text: 'Pendiente' },
  approved: { tone: 'success', text: 'Aprobada' },
  rejected: { tone: 'danger', text: 'Rechazada' },
  cancelled: { tone: 'neutral', text: 'Cancelada' },
};

/**
 * Solicitudes de salida (ADR 0012). Quien aprueba ve la bandeja de su ámbito: cada salida pedida,
 * con la cantidad ya apartada del frasco, se aprueba o se rechaza con motivo. El Operador ve las
 * suyas y puede cancelarlas mientras sigan pendientes. Nada es optimista: la lista se refresca con
 * lo que confirma el servidor.
 */
export function ReagentsRequestsPage() {
  const { me, requests, canResolve } = useReagents();
  const [params] = useSearchParams();
  const all = params.get('estado') === 'todas';

  if (requests.isPending) {
    return (
      <div className="grid gap-3" role="status" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    );
  }
  if (requests.isError) return <QueryErrorState error={requests.error} onRetry={() => void requests.refetch()} />;

  const { canApprove, items } = requests.data;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-muted">
          {canApprove
            ? 'Salidas que pidieron los Operadores. Lo pedido está apartado del frasco hasta que lo apruebes o lo rechaces.'
            : 'Tus salidas por aprobar. Lo pedido queda apartado del frasco hasta que un Administrador lo decida.'}
        </p>
        <StatusFilter all={all} pending={items.filter((item) => item.status === 'pending').length} />
      </div>
      {items.length === 0 ? (
        <div className="rounded-card bg-surface shadow-raised">
          <StatePanel
            icon={Inbox}
            title={
              all ? 'Todavía no hay solicitudes' : canApprove ? 'No hay salidas por aprobar' : 'No tienes solicitudes pendientes'
            }
            description={
              canApprove
                ? 'Cuando un Operador pida una salida, aparecerá aquí con la cantidad ya apartada del frasco.'
                : 'Cada salida que pidas quedará aquí hasta que un Administrador la apruebe o la rechace.'
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <RequestCard
                item={item}
                showPending={all}
                canApprove={canApprove && canResolve}
                canCancel={canResolve && item.mine}
                timeZone={me.workspace.timeZone}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Pendientes o todas, en la URL: el enlace del Resumen abre exactamente esta lista. */
function StatusFilter({ all, pending }: { all: boolean; pending: number }) {
  const options = [
    { to: '?', label: 'Pendientes', count: pending, current: !all },
    { to: '?estado=todas', label: 'Todas', count: 0, current: all },
  ];
  return (
    <nav aria-label="Filtrar solicitudes" className="inline-flex rounded-full bg-surface-sunken p-1">
      {options.map((option) => (
        <Link
          key={option.label}
          to={option.to}
          replace
          aria-current={option.current ? 'page' : undefined}
          className={cn(
            'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors',
            option.current ? 'bg-surface text-ink shadow-raised' : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
          {option.count > 0 ? (
            <span className="ml-1.5 inline-flex min-w-5 justify-center rounded-full bg-warning-soft px-1.5 text-[12px] font-semibold tabular-nums text-warning">
              {option.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

function RequestCard({
  item,
  showPending,
  canApprove,
  canCancel,
  timeZone,
}: {
  item: IssueRequestItem;
  /** En «Todas», la pendiente lleva su estado como las decididas; en la bandeja sobra. */
  showPending: boolean;
  canApprove: boolean;
  canCancel: boolean;
  timeZone: string;
}) {
  const pending = item.status === 'pending';
  const badge = pending && !showPending ? null : statusBadge[item.status];
  const [rejecting, setRejecting] = useState(false);
  const titleId = `solicitud-${item.id}`;

  return (
    <article aria-labelledby={titleId} className="rounded-card bg-surface p-5 shadow-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 id={titleId} className="font-semibold text-ink">
            {item.product.name}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            <span className="whitespace-nowrap tabular-nums">{item.container.code}</span> · {item.location.name}
          </p>
        </div>
        <Quantity value={`-${item.quantity}`} unit={item.unit} signed className="text-lg font-semibold text-ink" />
      </header>
      <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="text-ink-muted">Motivo</dt>
        <dd className="text-ink">
          {item.reason} <span className="whitespace-nowrap text-ink-muted">→ {item.destination}</span>
        </dd>
        <dt className="text-ink-muted">Pedida por</dt>
        <dd className="text-ink">
          {item.requester.displayName ?? 'Miembro anterior'}
          <span className="text-ink-muted"> · {formatDateTime(item.requestedAt, timeZone)}</span>
        </dd>
      </dl>
      {badge ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
          <Badge tone={badge.tone}>{badge.text}</Badge>
          <span>
            {[
              // Cancelada: la retiró quien la pidió, que ya figura arriba.
              item.status !== 'cancelled' && item.decider ? `por ${item.decider.displayName ?? 'un miembro anterior'}` : null,
              item.decidedAt ? formatDateTime(item.decidedAt, timeZone) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </p>
      ) : null}
      {item.status === 'rejected' && item.decisionReason ? (
        <p className="mt-2 rounded-control bg-surface-sunken px-3 py-2 text-sm text-ink">{item.decisionReason}</p>
      ) : null}
      {pending && canApprove ? (
        rejecting ? (
          <RejectForm item={item} onDone={() => setRejecting(false)} />
        ) : (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
            <ApproveButton item={item} />
            <Button size="sm" variant="ghost" className="max-lg:h-11" onClick={() => setRejecting(true)}>
              <X aria-hidden />
              Rechazar
            </Button>
          </div>
        )
      ) : null}
      {pending && !canApprove && canCancel ? (
        <div className="mt-4 border-t border-line pt-3">
          <CancelButton item={item} />
        </div>
      ) : null}
    </article>
  );
}

/** Si otra persona ya resolvió la solicitud, se dice y la lista se refresca. */
function useResolvedRefresh() {
  const { workspaceId } = useReagents();
  const queryClient = useQueryClient();
  const reagentsKey = useReagentsKey(workspaceId);
  return (error: unknown) => {
    toast.error(commandErrorMessage(error));
    if (isApiError(error, 'REQUEST_RESOLVED')) void queryClient.invalidateQueries({ queryKey: reagentsKey });
  };
}

function ApproveButton({ item }: { item: IssueRequestItem }) {
  const { workspaceId } = useReagents();
  const command = useCommand(workspaceId, `/issue-requests/${item.id}/approve`, movementResponse);
  const onError = useResolvedRefresh();
  return (
    <Button
      variant="primary"
      size="sm"
      className="max-lg:h-11"
      loading={command.isPending}
      aria-describedby={`solicitud-${item.id}`}
      onClick={async () => {
        try {
          const result = await command.mutateAsync(undefined);
          toast.success('Salida aprobada', {
            description: `Quedan ${formatDecimal(result.balance)} ${result.unit} en ${item.container.code}`,
          });
        } catch (error) {
          onError(error);
        }
      }}
    >
      <Check aria-hidden />
      Aprobar salida
    </Button>
  );
}

function RejectForm({ item, onDone }: { item: IssueRequestItem; onDone: () => void }) {
  const { workspaceId } = useReagents();
  const command = useCommand(workspaceId, `/issue-requests/${item.id}/reject`, releasedRequest);
  const onError = useResolvedRefresh();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  // mutateAsync y no mutate: al confirmarse, la tarjeta sale de la lista y se desmonta, y los
  // avisos de mutate no llegarían a mostrarse.
  const submit = async () => {
    const parsed = rejectIssueRequest.safeParse({ reason: reason.trim() });
    if (!parsed.success) {
      setError('Escribe por qué se rechaza: quien la pidió lo verá.');
      return;
    }
    try {
      await command.mutateAsync(parsed.data);
      toast.success('Solicitud rechazada', {
        description: `Se liberaron ${formatDecimal(item.quantity)} ${item.unit} de ${item.container.code}`,
      });
      onDone();
    } catch (failure) {
      onError(failure);
    }
  };

  return (
    <form
      className="mt-4 grid gap-3 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field label="Motivo del rechazo" error={error} hint="Quien pidió la salida lo verá en sus solicitudes.">
        <Textarea
          autoFocus
          rows={2}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError(undefined);
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="max-lg:h-11" loading={command.isPending}>
          Rechazar solicitud
        </Button>
        <Button size="sm" variant="ghost" className="max-lg:h-11" onClick={onDone}>
          Volver
        </Button>
      </div>
    </form>
  );
}

function CancelButton({ item }: { item: IssueRequestItem }) {
  const { workspaceId } = useReagents();
  const command = useCommand(workspaceId, `/issue-requests/${item.id}/cancel`, releasedRequest);
  const onError = useResolvedRefresh();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="max-lg:h-11"
      loading={command.isPending}
      aria-describedby={`solicitud-${item.id}`}
      onClick={async () => {
        try {
          await command.mutateAsync(undefined);
          toast.success('Solicitud cancelada', {
            description: `Se liberaron ${formatDecimal(item.quantity)} ${item.unit} de ${item.container.code}`,
          });
        } catch (error) {
          onError(error);
        }
      }}
    >
      <X aria-hidden />
      Cancelar solicitud
    </Button>
  );
}
