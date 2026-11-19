import { lendRequest, sumDecimals, type StockedMaterial } from '@platlab/contracts';
import { Field, Input, Select, Textarea, sectionLabel, toast } from '@platlab/ui';
import { HandHelping, Hand } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FilterPill } from '../../app/filter-pill';
import { addDays, countText, todayInZone } from '../../app/format';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useLend } from './commands';
import { useMaterials } from './context';
import { LoanCatalog } from './loan-catalog';
import { lineProblem, pickMaterial, stepLine, ticketTotals, type DraftLine } from './loan-draft';
import { LoanTicketLine } from './loan-ticket-line';
import { useBorrowers, useFetchStock } from './queries';
import { normalizeQuantity } from './text';

interface Values {
  borrowerId: string;
  dueOn: string;
  notes: string;
  lines: string;
}

/** Atajos de plazo: lo que más se pide al prestar. «Sin fecha» deja el vale sin vencimiento. */
const dueShortcuts = [
  { label: 'Mañana', days: 1 },
  { label: 'En 1 semana', days: 7 },
  { label: 'En 2 semanas', days: 14 },
] as const;

/**
 * «Nuevo préstamo» como mostrador (ADR 0025): a la izquierda los materiales para tocar, a la derecha el vale con quién se
 * lleva el material, el plazo y las cantidades. Prestar aparta lo prestado: sigue siendo del laboratorio, pero deja de
 * estar disponible. Se registra con lo que el servidor confirma; un error de disponibilidad no deja nada a medias.
 */
export function LoanSheet({ workspaceId, open, onOpenChange, onCreated }: SheetBaseProps & { onCreated?: (loanId: string) => void }) {
  const { me } = useMaterials();
  const lend = useLend(workspaceId);
  const borrowers = useBorrowers(workspaceId, open);
  const fetchStock = useFetchStock(workspaceId);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<Values>({ defaultValues: { borrowerId: '', dueOn: '', notes: '', lines: '' } });
  const errors = form.formState.errors;
  const today = todayInZone(me.workspace.timeZone);
  const dueOn = form.watch('dueOn');

  const borrowerOptions = useMemo(() => (borrowers.data?.items ?? []).map((member) => ({ value: member.id, label: member.name })), [borrowers.data]);
  const inTicket = useMemo(() => {
    const perProduct = new Map<string, string[]>();
    for (const line of lines) perProduct.set(line.productId, [...(perProduct.get(line.productId) ?? []), normalizeQuantity(line.quantity)]);
    return new Map([...perProduct].map(([productId, quantities]) => [productId, sumDecimals(quantities.filter((quantity) => /^\d+(\.\d+)?$/.test(quantity)))]));
  }, [lines]);
  const totals = ticketTotals(lines);

  const patchLine = (key: string, patch: Partial<DraftLine>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const pick = async (material: StockedMaterial) => {
    setGeneralError(null);
    form.clearErrors('lines');
    try {
      const stock = await fetchStock(material.id);
      setLines((current) => pickMaterial(current, material, stock.items));
    } catch (error) {
      setGeneralError(materialsErrorMessage(error));
    }
  };

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    if (lines.length === 0) {
      form.setError('lines', { message: 'Toca un material para agregarlo al vale.' });
      return;
    }
    if (lines.some((line) => lineProblem(line) !== null)) {
      form.setError('lines', { message: 'Corrige las cantidades marcadas en el vale.' });
      return;
    }
    const payload = validate(
      lendRequest,
      {
        borrowerId: values.borrowerId,
        ...(values.dueOn ? { dueOn: values.dueOn } : {}),
        ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
        lines: lines.map((line) => ({ positionId: line.positionId, quantity: normalizeQuantity(line.quantity) })),
      },
      form,
    );
    if (!payload) return;
    try {
      const created = await lend.mutateAsync(payload);
      toast.success('Préstamo registrado', { description: `${created.code} · ${created.borrower.name}` });
      onCreated?.(created.id);
      onOpenChange(false);
    } catch (error) {
      setGeneralError(materialsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={HandHelping}
      title="Nuevo préstamo"
      description="Toca el material que se lleva. Sigue siendo del laboratorio, pero queda apartado hasta que lo devuelvan."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Prestar"
      pending={lend.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty || lines.length > 0}
      status={lines.length === 0 ? 'El vale está vacío' : `${countText(totals.materials, 'material', 'materiales')} · ${totals.units} u en el vale`}
      wide="xl"
      fullscreenMobile
      pendingText="Registrando…"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-label="Materiales para prestar">
          <h3 className={sectionLabel}>Materiales</h3>
          <div className="mt-3">
            <LoanCatalog workspaceId={workspaceId} inTicket={inTicket} onPick={(material) => void pick(material)} />
          </div>
        </section>
        <section aria-label="Vale de préstamo" className="grid content-start gap-4 rounded-card bg-surface-sunken p-4">
          <h3 className={sectionLabel}>Vale</h3>
          <Field label="Prestatario" required hint="Quién se lleva el material: un miembro del espacio." error={errors.borrowerId?.message}>
            <Controller
              control={form.control}
              name="borrowerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} placeholder={borrowers.isPending ? 'Cargando…' : 'Elige a la persona'} options={borrowerOptions} />
              )}
            />
          </Field>
          <Field label="Devolver el" optional hint="Sin fecha, el préstamo no vence." error={errors.dueOn?.message}>
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Plazos frecuentes">
                {dueShortcuts.map(({ label, days }) => {
                  const date = addDays(today, days);
                  return <FilterPill key={label} label={label} active={dueOn === date} onToggle={() => form.setValue('dueOn', dueOn === date ? '' : date, { shouldDirty: true })} />;
                })}
              </div>
              <Input type="date" min={today} className="h-11 sm:h-10" {...form.register('dueOn')} />
            </div>
          </Field>
          <div className="grid gap-2">
            {lines.length === 0 ? (
              <p className="flex items-center gap-2 rounded-panel border border-dashed border-line-strong px-3 py-4 text-sm text-ink-muted">
                <Hand className="size-4 shrink-0" aria-hidden />
                Toca un material para agregarlo al vale.
              </p>
            ) : (
              <ul className="grid gap-2">
                {lines.map((line) => (
                  <LoanTicketLine
                    key={line.key}
                    line={line}
                    lines={lines}
                    onStep={(delta) => setLines((current) => stepLine(current, line.key, delta))}
                    onQuantity={(text) => patchLine(line.key, { quantity: text })}
                    onPosition={(positionId) => patchLine(line.key, { positionId })}
                    onRemove={() => setLines((current) => current.filter((entry) => entry.key !== line.key))}
                  />
                ))}
              </ul>
            )}
            {errors.lines?.message ? (
              <p role="alert" className="text-sm text-danger">
                {errors.lines.message}
              </p>
            ) : null}
          </div>
          <Field label="Notas" optional hint="Para qué lo usa o a qué práctica corresponde." error={errors.notes?.message}>
            <Textarea maxLength={500} rows={2} {...form.register('notes')} />
          </Field>
        </section>
      </div>
    </FormSheet>
  );
}
