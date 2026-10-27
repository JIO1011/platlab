import { requestReasonRequest } from '@platlab/contracts';
import { Button, Field, Textarea, toast } from '@platlab/ui';
import { CalendarDays, Check, CircleX, PencilLine, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { isApiError } from '../../app/api';
import { FormSheet, validate } from '../../app/form-sheet';
import { labsErrorMessage, useApproveRequest, useRejectRequest, useRequestChanges, useRequestResolved, useVersionConflict } from './commands';
import { approvedMessage } from './request-approval';
import type { RequestView } from './request-draft';
import { pendingDates } from './schedule-placement';
import { actionBar, primaryGradient } from './style';

type Resolution = 'changes' | 'reject';

const resolutions: Record<Resolution, { trigger: string; icon: LucideIcon; field: string; text: (requester: string) => string; action: string; done: string }> = {
  changes: {
    trigger: 'Pedir cambios',
    icon: PencilLine,
    field: 'Qué debe corregir',
    text: (requester) => `${requester} verá este motivo, podrá corregir la solicitud y volver a enviarla.`,
    action: 'Pedir cambios',
    done: 'Cambios solicitados',
  },
  reject: {
    trigger: 'Rechazar',
    icon: CircleX,
    field: 'Motivo del rechazo',
    text: (requester) => `${requester} verá este motivo. La solicitud quedará rechazada y no se deshace desde esta pantalla.`,
    action: 'Rechazar solicitud',
    done: 'Solicitud rechazada',
  },
};

interface ReasonSheetProps {
  workspaceId: string;
  request: RequestView;
  resolution: Resolution;
  mutation: ReturnType<typeof useRejectRequest>;
  onDismiss: () => void;
}

/** El motivo (hasta 500 caracteres) en una hoja, con su confirmación. Nada cambia hasta que el servidor confirma. */
function ReasonSheet({ workspaceId, request, resolution, mutation, onDismiss }: ReasonSheetProps) {
  const conflict = useVersionConflict(workspaceId);
  const resolved = useRequestResolved(workspaceId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({ defaultValues: { reason: '' } });
  const copy = resolutions[resolution];

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const { reason } = form.getValues();
    if (reason.trim() === '') {
      form.setError('reason', { message: 'Escribe el motivo: quien la pidió lo verá.' });
      return;
    }
    const payload = validate(requestReasonRequest, { expectedVersion: request.version, reason }, form);
    if (!payload) return;
    try {
      await mutation.mutateAsync(payload);
      toast.success(copy.done, { description: request.code });
      onDismiss();
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) {
        void conflict('esta solicitud');
        onDismiss();
      } else if (isApiError(failure, 'REQUEST_RESOLVED')) {
        void resolved();
        onDismiss();
      } else {
        setGeneralError(labsErrorMessage(failure));
      }
    }
  };

  return (
    <FormSheet
      icon={copy.icon}
      title={copy.trigger}
      description={copy.text(request.requesterName)}
      open
      onOpenChange={(open) => (open ? undefined : onDismiss())}
      submitLabel={copy.action}
      pending={mutation.isPending}
      generalError={generalError ?? form.formState.errors.root?.message ?? null}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty}
      destructive={resolution === 'reject'}
      focusFirst
      required
      pendingText="Enviando el motivo…"
    >
      <Field label={copy.field} required hint="Hasta 500 caracteres." error={form.formState.errors.reason?.message}>
        <Textarea rows={4} maxLength={500} {...form.register('reason')} />
      </Field>
    </FormSheet>
  );
}

const linkButton =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border px-4 text-sm font-medium text-on-action transition-colors sm:h-10 [&_svg]:size-4';

/**
 * Las acciones de quien revisa una solicitud enviada (`labs.request.review`): «Pedir cambios» y «Rechazar», que piden el
 * motivo en una hoja, y la principal. «Aprobar» (también con `labs.schedule.manage`) programa cada fecha pendiente donde y
 * cuando se pidió; sin laboratorio pedido, en su lugar, «Programar en el Cronograma» lleva al día de su primera fecha.
 * «Aprobar» no pinta nada antes: el aviso dice los códigos programados o el motivo que dio el servidor.
 */
export function ReviewActions({ workspaceId, request, canSchedule }: { workspaceId: string; request: RequestView; canSchedule: boolean }) {
  const approve = useApproveRequest(workspaceId, request.id);
  const changes = useRequestChanges(workspaceId, request.id);
  const reject = useRejectRequest(workspaceId, request.id);
  const conflict = useVersionConflict(workspaceId);
  const resolved = useRequestResolved(workspaceId);
  const [open, setOpen] = useState<Resolution | null>(null);
  const first = pendingDates(request)[0];

  const approveNow = async () => {
    try {
      const done = await approve.mutateAsync({ expectedVersion: request.version });
      const message = approvedMessage(done.items);
      toast.success(message.title, message.description ? { description: message.description } : undefined);
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) void conflict('esta solicitud');
      else if (isApiError(failure, 'REQUEST_RESOLVED')) void resolved();
      else toast.error(`No se pudo aprobar ${request.code}`, { description: labsErrorMessage(failure) });
    }
  };

  return (
    <div className={actionBar}>
      {(Object.keys(resolutions) as Resolution[]).map((resolution) => (
        <Button key={resolution} className="h-11 sm:h-10" disabled={approve.isPending} aria-haspopup="dialog" onClick={() => setOpen(resolution)}>
          {resolutions[resolution].trigger}
        </Button>
      ))}
      {canSchedule ? (
        request.areaId === null ? (
          <Link to={`/e/${workspaceId}/laboratorios/cronograma${first ? `?dia=${first}` : ''}`} className={`${linkButton} ${primaryGradient}`}>
            <CalendarDays aria-hidden />
            Programar en el Cronograma
          </Link>
        ) : (
          <Button variant="primary" className={`h-11 sm:h-10 ${primaryGradient}`} loading={approve.isPending} onClick={() => void approveNow()}>
            <Check aria-hidden />
            Aprobar
          </Button>
        )
      ) : null}
      {open !== null ? (
        <ReasonSheet key={open} workspaceId={workspaceId} request={request} resolution={open} mutation={open === 'changes' ? changes : reject} onDismiss={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
