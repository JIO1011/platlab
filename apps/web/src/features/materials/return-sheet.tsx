import { returnRequest, sumDecimals, type Loan } from '@platlab/contracts';
import { Button, Field, Input, Quantity, sectionLabel, toast } from '@platlab/ui';
import { PackageCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { FormSheet, type SheetBaseProps } from '../../app/form-sheet';
import { materialsErrorMessage, useReturn } from './commands';
import { normalizeQuantity } from './text';

/** Lo que se escribe por línea al devolver: cuánto volvió bien, dañado y perdido. */
interface Entry {
  good: string;
  damaged: string;
  lost: string;
}

/** Lo común: todo lo que falta volvió bien. */
const defaultEntry = (outstanding: string): Entry => ({ good: outstanding, damaged: '', lost: '' });

const quantities = (entry: Entry) => [entry.good, entry.damaged, entry.lost].map(normalizeQuantity).map((value) => (value === '' ? '0' : value));

/**
 * «Registrar devolución» de un vale (ADR 0025): por cada línea con algo pendiente se dice cuánto volvió bien, cuánto
 * quedó dañado y cuánto se perdió. Puede ser parcial. Lo dañado y lo perdido dan de baja del inventario y no se
 * deshacen; por eso la hoja lo dice antes de confirmar. Parte con «todo volvió bien», que es lo común.
 */
export function ReturnSheet({ workspaceId, open, onOpenChange, loan }: SheetBaseProps & { loan: Loan }) {
  const pending = loan.lines.filter((line) => line.outstanding !== '0');
  const command = useReturn(workspaceId, loan.id);
  const [entries, setEntries] = useState<Record<number, Entry>>(() => Object.fromEntries(pending.map((line) => [line.line, defaultEntry(line.outstanding)])));
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const patch = (line: number, change: Partial<Entry>) => setEntries((current) => ({ ...current, [line]: { ...current[line]!, ...change } }));
  // Solo pide confirmar el descarte si la persona cambió algo respecto a «todo volvió bien».
  const changed = pending.some((line) => {
    const entry = entries[line.line]!;
    const base = defaultEntry(line.outstanding);
    return entry.good !== base.good || entry.damaged !== base.damaged || entry.lost !== base.lost;
  });
  const writtenOff = sumDecimals(pending.flatMap((line) => quantities(entries[line.line]!).slice(1)));

  const submit = async () => {
    setGeneralError(null);
    setFieldError(null);
    const lines = pending
      .map((line) => ({ line: line.line, entry: quantities(entries[line.line]!) }))
      .filter(({ entry }) => entry.some((value) => value !== '0'))
      .map(({ line, entry: [good, damaged, lost] }) => ({ line, good: good!, damaged: damaged!, lost: lost! }));
    if (lines.length === 0) {
      setFieldError('Indica cuánto volvió en al menos una línea.');
      return;
    }
    const parsed = returnRequest.safeParse({ expectedVersion: loan.version, lines });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Revisa las cantidades.');
      return;
    }
    try {
      const updated = await command.mutateAsync(parsed.data);
      toast.success(updated.status === 'closed' ? 'Préstamo cerrado' : 'Devolución registrada', { description: `${updated.code} · ${updated.borrower.name}` });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(materialsErrorMessage(error));
    }
  };

  return (
    <FormSheet
      icon={PackageCheck}
      title="Registrar devolución"
      description={`${loan.code} · ${loan.borrower.name}. Puede ser parcial: lo que no se devuelva queda pendiente.`}
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Registrar devolución"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
      dirty={changed}
      wide
      fullscreenMobile
      pendingText="Registrando…"
      destructive={writtenOff !== '0'}
    >
      <ul className="grid gap-3">
        {pending.map((line) => {
          const entry = entries[line.line]!;
          return (
            <li key={line.line} className="grid gap-3 rounded-panel bg-surface-sunken p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 break-words font-medium text-ink">{line.productName}</p>
                <p className="text-sm text-ink-muted">
                  Falta <Quantity value={line.outstanding} unit={line.unit} />
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Volvió bien">
                  <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" value={entry.good} onChange={(event) => patch(line.line, { good: event.target.value })} />
                </Field>
                <Field label="Dañado">
                  <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" value={entry.damaged} onChange={(event) => patch(line.line, { damaged: event.target.value })} />
                </Field>
                <Field label="Perdido">
                  <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" value={entry.lost} onChange={(event) => patch(line.line, { lost: event.target.value })} />
                </Field>
              </div>
              <Button className="h-11 w-fit sm:h-9" onClick={() => patch(line.line, defaultEntry(line.outstanding))}>
                Todo volvió bien
              </Button>
            </li>
          );
        })}
      </ul>
      {fieldError ? <p role="alert" className="text-sm text-danger">{fieldError}</p> : null}
      {writtenOff !== '0' ? (
        <p role="status" className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Se darán de baja <strong>{writtenOff} u</strong> del inventario y quedarán como deuda del préstamo. Una baja registrada no se deshace: se corrige con otro ajuste.
          </span>
        </p>
      ) : null}
      <p className={sectionLabel}>Lo que no se devuelva hoy queda pendiente en el vale.</p>
    </FormSheet>
  );
}
