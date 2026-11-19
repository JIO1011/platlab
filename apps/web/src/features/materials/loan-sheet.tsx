import { lendRequest } from '@platlab/contracts';
import { Button, Field, Input, Select, Textarea, sectionLabel, toast } from '@platlab/ui';
import { HandHelping, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { todayInZone } from '../../app/format';
import { FormSheet, validate, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useLend } from './commands';
import { useMaterials } from './context';
import { emptyLine, LoanLineRow, type DraftLine } from './loan-line-row';
import { useBorrowers } from './queries';
import { normalizeQuantity } from './text';

interface Values {
  borrowerId: string;
  dueOn: string;
  notes: string;
  lines: string;
}

/**
 * «Nuevo préstamo» (ADR 0025): quién se lleva el material (un miembro del espacio), cuándo debe devolverlo y qué
 * lleva. Prestar aparta lo prestado: sigue siendo del laboratorio, pero deja de estar disponible. Se registra con
 * lo que el servidor confirma; un error de disponibilidad no deja nada a medias.
 */
export function LoanSheet({ workspaceId, open, onOpenChange, onCreated }: SheetBaseProps & { onCreated?: (loanId: string) => void }) {
  const { me } = useMaterials();
  const lend = useLend(workspaceId);
  const borrowers = useBorrowers(workspaceId, open);
  const [lines, setLines] = useState<DraftLine[]>(() => [emptyLine()]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm<Values>({ defaultValues: { borrowerId: '', dueOn: '', notes: '', lines: '' } });
  const errors = form.formState.errors;
  const today = todayInZone(me.workspace.timeZone);

  const borrowerOptions = useMemo(() => (borrowers.data?.items ?? []).map((member) => ({ value: member.id, label: member.name })), [borrowers.data]);
  // Estable entre renders: cada fila lo usa en un efecto.
  const patchLine = useCallback((key: string, patch: Partial<DraftLine>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line))), []);

  const submit = async () => {
    setGeneralError(null);
    form.clearErrors();
    const values = form.getValues();
    if (lines.some((line) => !line.positionId || normalizeQuantity(line.quantity) === '')) {
      form.setError('lines', { message: 'Cada línea necesita el material, de dónde sale y la cantidad.' });
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
      description="El material sigue siendo del laboratorio, pero queda apartado hasta que lo devuelvan."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Prestar"
      pending={lend.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={form.formState.isDirty || lines.some((line) => line.productId !== null)}
      required
      wide
      fullscreenMobile
      pendingText="Registrando…"
    >
      <Field label="Prestatario" required hint="Quién se lleva el material: un miembro del espacio." error={errors.borrowerId?.message}>
        <Controller
          control={form.control}
          name="borrowerId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} placeholder={borrowers.isPending ? 'Cargando…' : 'Elige a la persona'} options={borrowerOptions} />
          )}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Devolver el" optional hint="Sin fecha, el préstamo no vence." error={errors.dueOn?.message}>
          <Input type="date" min={today} className="h-11 sm:h-10" {...form.register('dueOn')} />
        </Field>
      </div>
      <fieldset className="grid gap-3">
        <legend className={sectionLabel}>Material</legend>
        <ul className="grid gap-3">
          {lines.map((line, index) => (
            <LoanLineRow
              key={line.key}
              line={line}
              index={index}
              removable={lines.length > 1}
              onChange={(patch) => patchLine(line.key, patch)}
              onRemove={() => setLines((current) => current.filter((entry) => entry.key !== line.key))}
            />
          ))}
        </ul>
        {errors.lines?.message ? <p role="alert" className="text-sm text-danger">{errors.lines.message}</p> : null}
        <Button className="h-11 w-fit sm:h-10" onClick={() => setLines((current) => [...current, emptyLine()])}>
          <Plus aria-hidden />
          Agregar material
        </Button>
      </fieldset>
      <Field label="Notas" optional hint="Para qué lo usa o a qué práctica corresponde." error={errors.notes?.message}>
        <Textarea maxLength={500} rows={2} {...form.register('notes')} />
      </Field>
    </FormSheet>
  );
}
