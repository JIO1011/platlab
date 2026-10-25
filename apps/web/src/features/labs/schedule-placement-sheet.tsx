import { scheduleActivityRequest, scheduleCheck, updateActivityRequest, type Activity, type RequestSummary, type Space } from '@platlab/contracts';
import { Badge, Field, Input, Select, toast, type SelectOption } from '@platlab/ui';
import { CalendarCheck, CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../app/api';
import { FormSheet } from '../../app/form-sheet';
import { formatFullDate } from '../../app/format';
import { labsErrorMessage, useMoveActivity, useRefreshLabs, useRequestResolved, useScheduleActivity, useVersionConflict } from './commands';
import { useClosures, usePeriods, useRequestDetail, useSchedule } from './queries';
import { timeText, toMinutes, weekDates } from './schedule-grid';
import { blockingTexts, capacityText, contextFor, durationOf, endFor, scheduledMessage } from './schedule-placement';

/**
 * Lo que la hoja de programar o mover parte sabiendo: programar una fecha pendiente de una solicitud (con la hora pedida)
 * o mover un bloque el mismo día. Arrastrar guarda sin esta hoja; ella queda para el botón (teclado y móvil) y para
 * cambiar el responsable.
 */
export type PlacementTarget =
  | { kind: 'program'; request: RequestSummary; pending: string[]; date: string }
  | { kind: 'move'; activity: Activity; areaId: string; start: number };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const fallbackMinutes = 60;

/**
 * «Programar…» y «Mover…» (Administrador, ADR 0023): fecha (las pendientes), área, inicio–fin y responsable, con la
 * misma validación en vivo que al arrastrar (`scheduleCheck`: ✔ cabe, ✖ con el motivo, ⚠ aforo). Programar es aprobar
 * la fecha. Nada cambia en pantalla hasta que el servidor confirma; entonces avisa con el código del bloque.
 */
export function PlacementSheet({
  workspaceId,
  target,
  open,
  onOpenChange,
  today,
  spaces,
  responsibles,
  meId,
  requestHref,
  onDone,
}: {
  workspaceId: string;
  target: PlacementTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  /** Las áreas habilitadas (y, al mover, la que ya tiene el bloque). */
  spaces: readonly Space[];
  responsibles: ReadonlyArray<{ id: string; name: string }>;
  /** El principal de quien programa: si está entre los responsables, es el de por defecto. */
  meId: string;
  /** Dónde está la solicitud del bloque en Recibidas (para pedir cambios de día). */
  requestHref: string;
  /** Tras confirmar el servidor: el día del bloque, para que la tabla lo muestre. */
  onDone: (date: string) => void;
}) {
  const program = target.kind === 'program';
  const duration = program ? (durationOf(target.request) ?? fallbackMinutes) : toMinutes(target.activity.endsAt) - toMinutes(target.activity.startsAt);
  const participants = program ? (target.request.participants ?? 0) : target.activity.participants;
  const start0 = program ? (target.request.startsAt ? toMinutes(target.request.startsAt) : 8 * 60) : target.start;
  const end0 = program && target.request.endsAt ? toMinutes(target.request.endsAt) : endFor(start0, duration);

  const [date, setDate] = useState(program ? target.date : target.activity.date);
  // El área que pidió el docente solo viene en el detalle de la solicitud: se pide únicamente la que está abierta.
  const detail = useRequestDetail(workspaceId, program ? target.request.id : '', program);
  const asked = program ? spaces.find((item) => item.areaId === detail.data?.areaId) : undefined;
  const [areaChoice, setAreaChoice] = useState<string | null>(null);
  const areaId = areaChoice ?? (program ? asked?.areaId : target.areaId) ?? '';
  const [startsAt, setStartsAt] = useState(timeText(start0));
  const [endsAt, setEndsAt] = useState(timeText(end0));
  const [responsibleId, setResponsibleId] = useState(
    program ? (responsibles.find((option) => option.id === meId)?.id ?? '') : target.activity.responsibleId,
  );
  const [error, setError] = useState<string | null>(null);

  const scheduleCommand = useScheduleActivity(workspaceId);
  const moveCommand = useMoveActivity(workspaceId, program ? '' : target.activity.id);
  const conflict = useVersionConflict(workspaceId);
  const resolved = useRequestResolved(workspaceId);
  const refresh = useRefreshLabs(workspaceId);

  const week = weekDates(date);
  const schedule = useSchedule(workspaceId, week[0]!, week[6]!);
  const closures = useClosures(workspaceId, week[0]!, week[6]!);
  const periods = usePeriods(workspaceId);
  const loading = schedule.isPending || closures.isPending || periods.isPending;

  const space = spaces.find((item) => item.areaId === areaId);
  const timesOk = timePattern.test(startsAt) && timePattern.test(endsAt) && startsAt < endsAt;
  const check =
    space && timesOk && schedule.data && closures.data && periods.data
      ? scheduleCheck(
          { date, startsAt, endsAt },
          contextFor({
            today,
            participants,
            space,
            periods: periods.data.items,
            closures: closures.data.items,
            activities: schedule.data.items,
            date,
            ignoreId: program ? undefined : target.activity.id,
          }),
        )
      : null;
  const blocked = (check?.blocking.length ?? 0) > 0;
  const incomplete = !space || responsibleId === '' || !timesOk;
  const pending = scheduleCommand.isPending || moveCommand.isPending;

  const areaOptions: SelectOption[] = spaces.map((item) => ({ value: item.areaId, label: `${item.areaName} (${item.abbreviation})`, detail: `Aforo ${item.capacity}` }));
  const responsibleOptions: SelectOption[] = responsibles.map((option) => ({ value: option.id, label: option.name }));
  const dateOptions: SelectOption[] = program ? target.pending.map((value) => ({ value, label: formatFullDate(value) })) : [];

  /** Cambiar el inicio mueve el fin con él: el bloque conserva su duración. */
  const changeStart = (value: string) => {
    setStartsAt(value);
    if (timePattern.test(value)) setEndsAt(timeText(endFor(toMinutes(value), duration)));
  };

  const submit = async () => {
    setError(null);
    if (!check || blocked || incomplete) return;
    try {
      let result;
      if (program) {
        const parsed = scheduleActivityRequest.safeParse({ requestId: target.request.id, date, areaId, startsAt, endsAt, responsibleId, expectedVersion: target.request.version });
        if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
        result = await scheduleCommand.mutateAsync(parsed.data);
      } else {
        const parsed = updateActivityRequest.safeParse({ areaId, startsAt, endsAt, responsibleId, expectedVersion: target.activity.version });
        if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
        result = await moveCommand.mutateAsync(parsed.data);
      }
      const message = scheduledMessage(result.activity.code, program ? 'programado' : 'movido', result.warnings, participants, space?.capacity);
      toast.success(message.title, message.description ? { description: message.description } : undefined);
      onDone(result.activity.date);
      onOpenChange(false);
    } catch (failure) {
      if (isApiError(failure, 'VERSION_CONFLICT')) {
        void conflict(program ? 'esta solicitud' : 'este bloque');
        onOpenChange(false);
      } else if (isApiError(failure, 'REQUEST_RESOLVED')) {
        void resolved();
        onOpenChange(false);
      } else if (isApiError(failure, 'VALIDATION_FAILED')) {
        setError(failure.message);
        void refresh();
      } else {
        setError(labsErrorMessage(failure));
      }
    }
  };

  const orderWrong = timePattern.test(startsAt) && timePattern.test(endsAt) && startsAt >= endsAt;
  const capacity = check && space ? capacityText(check, participants, space.capacity) : null;

  return (
    <FormSheet
      icon={program ? CalendarPlus : CalendarCheck}
      title={program ? 'Programar' : 'Mover bloque'}
      description={
        program
          ? `${target.request.title ?? target.request.code} · ${target.request.requesterName}`
          : `${target.activity.title} · ${target.activity.code}. Mismo día; cambiar el día es pedir cambios al docente.`
      }
      open={open}
      onOpenChange={onOpenChange}
      submitLabel={program ? 'Programar' : 'Mover'}
      submitDisabled={blocked || incomplete || loading}
      pending={pending}
      generalError={error}
      onSubmit={() => void submit()}
      pendingText={program ? 'Programando…' : 'Moviendo…'}
      focusFirst
    >
      {program && target.pending.length > 1 ? (
        <Field label="Fecha" hint={`Pendientes: ${target.pending.length} de ${target.request.dates.length}.`}>
          <Select value={date} onValueChange={setDate} options={dateOptions} placeholder="Elige la fecha" triggerClassName="h-11 sm:h-10" />
        </Field>
      ) : (
        <p className="text-sm text-ink">
          <span className="text-[13px] text-ink-muted">Fecha </span>
          <span className="font-medium">{formatFullDate(date)}</span>
        </p>
      )}
      <Field label="Área" required hint={asked ? `El docente pidió ${asked.areaName}.` : undefined}>
        <Select value={areaId} onValueChange={setAreaChoice} options={areaOptions} placeholder="Elige el área" triggerClassName="h-11 sm:h-10" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicio" required>
          <Input type="time" step={900} value={startsAt} onChange={(event) => changeStart(event.target.value)} className="h-11 tabular-nums sm:h-10" />
        </Field>
        <Field label="Fin" required>
          <Input type="time" step={900} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="h-11 tabular-nums sm:h-10" />
        </Field>
      </div>
      <div role="status" aria-live="polite" className="grid gap-1.5 text-sm">
        {orderWrong ? (
          <p className="font-medium text-danger">✖ La hora de fin va después del inicio.</p>
        ) : loading ? (
          <p className="text-ink-muted">Comprobando el área…</p>
        ) : check ? (
          <>
            {blocked ? (
              blockingTexts(check).map((text) => (
                <p key={text} className="font-medium text-danger">
                  ✖ {text}
                </p>
              ))
            ) : (
              <p className="font-medium text-success">✔ Libre: el área está disponible a esa hora.</p>
            )}
            {capacity ? (
              <p>
                <Badge tone="warning">
                  <span aria-hidden>⚠ </span>
                  {capacity}
                </Badge>
                <span className="ml-2 text-[13px] text-ink-muted">Solo avisa: tú decides.</span>
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-ink-muted">Elige el área y el horario para comprobar que cabe.</p>
        )}
      </div>
      <Field label="Responsable" required hint="Un Operador o el Administrador; el docente no lleva el bloque.">
        <Select value={responsibleId} onValueChange={setResponsibleId} options={responsibleOptions} placeholder="Elige quién lo lleva" triggerClassName="h-11 sm:h-10" />
      </Field>
      {!program ? (
        <p className="text-[13px] text-ink-muted">
          ¿Hay que cambiar el día?{' '}
          <Link to={requestHref} className="font-medium text-action underline-offset-2 hover:underline">
            Pide cambios al docente en la solicitud
          </Link>
          .
        </p>
      ) : null}
    </FormSheet>
  );
}
