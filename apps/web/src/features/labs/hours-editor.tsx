import type { WeeklyHours } from '@platlab/contracts';
import { Button, Input } from '@platlab/ui';
import { Copy, Plus, X } from 'lucide-react';
import { days, weekdays, type DayKey } from './hours-text';

/** Franjas que se proponen al agregar: la primera de la mañana y las siguientes, de la tarde. */
const firstSlot = { opens: '08:00', closes: '12:00' };
const nextSlot = { opens: '14:00', closes: '18:00' };

/**
 * El horario semanal (ADR 0023): por cada día, sus franjas de apertura y cierre; un día sin franjas está cerrado.
 * «Copiar el lunes» lo lleva a todos los días hábiles. Los controles son nativos: teclado y lectores de pantalla
 * funcionan sin más, y cada hora dice su día y su franja.
 */
export function HoursEditor({ value, onChange, error }: { value: WeeklyHours; onChange: (value: WeeklyHours) => void; error?: string | undefined }) {
  const setDay = (key: DayKey, slots: WeeklyHours[DayKey]) => onChange({ ...value, [key]: slots });
  const copyMonday = () => onChange({ ...value, ...Object.fromEntries(weekdays.map((key) => [key, value['1'].map((slot) => ({ ...slot }))])) });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="text-sm font-medium text-ink">Horario semanal</h3>
        <Button variant="ghost" size="sm" className="max-sm:h-11" disabled={value['1'].length === 0} onClick={copyMonday}>
          <Copy aria-hidden />
          Copiar el lunes a todos los días hábiles
        </Button>
      </div>
      <ul className="divide-y divide-line rounded-control border border-line">
        {days.map((day) => {
          const slots = value[day.key];
          return (
            <li key={day.key}>
              <fieldset className="grid min-w-0 gap-2 px-3 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4">
                <legend className="sr-only">{day.name}</legend>
                <p aria-hidden className="pt-2.5 text-sm font-medium text-ink max-sm:pt-0">
                  {day.name}
                </p>
                <div className="grid min-w-0 gap-2">
                  {slots.length === 0 ? <p className="text-sm text-ink-muted sm:pt-2.5">Cerrado</p> : null}
                  {slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${day.name}, franja ${index + 1}: apertura`}
                        value={slot.opens}
                        className="h-11 w-28 tabular-nums sm:h-10"
                        onChange={(event) => setDay(day.key, slots.map((entry, at) => (at === index ? { ...entry, opens: event.target.value } : entry)))}
                      />
                      <span aria-hidden className="text-ink-muted">
                        a
                      </span>
                      <Input
                        type="time"
                        aria-label={`${day.name}, franja ${index + 1}: cierre`}
                        value={slot.closes}
                        className="h-11 w-28 tabular-nums sm:h-10"
                        onChange={(event) => setDay(day.key, slots.map((entry, at) => (at === index ? { ...entry, closes: event.target.value } : entry)))}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-10"
                        aria-label={`Quitar la franja ${index + 1} del ${day.name.toLowerCase()}`}
                        onClick={() => setDay(day.key, slots.filter((_, at) => at !== index))}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-self-start max-sm:h-11"
                    aria-label={`Agregar una franja al ${day.name.toLowerCase()}`}
                    onClick={() => setDay(day.key, [...slots, slots.length === 0 ? firstSlot : nextSlot])}
                  >
                    <Plus aria-hidden />
                    Agregar franja
                  </Button>
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
