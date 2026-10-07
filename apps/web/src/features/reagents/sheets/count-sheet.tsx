import { countRequest, countResponse } from '@platlab/contracts';
import { Field, Input, Quantity, Select, normalizeDecimalInput, subtractDecimal, toast } from '@platlab/ui';
import { ClipboardCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCountLocations, usePositions } from '../../../app/queries';
import { commandErrorMessage, useCommand } from '../commands';
import { type SheetBaseProps, FormSheet } from './shared';

/** Diferencia exacta entre lo contado y lo registrado; null si lo contado no es una cantidad válida. */
function countDelta(raw: string, balance: string): string | null {
  const counted = normalizeDecimalInput(raw);
  if (!/^\d{1,15}(\.\d{1,9})?$/.test(counted)) return null;
  return subtractDecimal(counted, balance);
}

/**
 * Conteo de una ubicación (ADR 0012, entrega 4): se elige la ubicación, se anota lo que hay en cada
 * frasco y se confirma. Solo los que no cuadran se ajustan, en un solo movimiento «Conteo». Un frasco
 * sin anotar no se cuenta. Si alguien movió un frasco mientras se contaba, el servidor lo rechaza y
 * la lista se vuelve a cargar con los saldos nuevos.
 */
export function CountSheet({ workspaceId, open, onOpenChange }: SheetBaseProps) {
  const command = useCommand(workspaceId, '/counts', countResponse);
  const locations = useCountLocations(workspaceId, open);
  const [locationId, setLocationId] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  // Frascos cuyo saldo cambió mientras se contaban: su conteo ya no vale y se vuelve a hacer.
  const [stale, setStale] = useState<Set<string>>(new Set());
  const [generalError, setGeneralError] = useState<string | null>(null);
  const positions = usePositions(workspaceId, undefined, locationId || undefined, open && Boolean(locationId));
  // Un conteo cubre la ubicación entera: se cargan todas las páginas de frascos.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = positions;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const rows = (positions.data?.pages.flatMap((page) => page.items) ?? []).filter((p) => p.balance !== '0');
  const filled = rows.filter((p) => (counts[p.id] ?? '').trim() !== '');
  const differing = filled.filter((p) => {
    const delta = countDelta(counts[p.id] ?? '', p.balance);
    return delta !== null && delta !== '0';
  });

  async function submit() {
    setGeneralError(null);
    if (filled.length === 0) {
      setGeneralError('Anota lo contado en al menos un frasco.');
      return;
    }
    const parsed = countRequest.safeParse({
      locationId,
      lines: filled.map((p) => ({ positionId: p.id, expected: p.balance, counted: normalizeDecimalInput(counts[p.id] ?? '') })),
    });
    if (!parsed.success) {
      setGeneralError('Revisa las cantidades: cada una debe ser un número de cero o más.');
      return;
    }
    const sent = new Map(parsed.data.lines.map((line) => [line.positionId, line.expected]));
    try {
      const result = await command.mutateAsync(parsed.data);
      toast.success('Conteo registrado', {
        description:
          result.adjusted === 0
            ? 'Todo cuadra: no hubo ajustes.'
            : result.adjusted === 1
              ? '1 frasco ajustado con motivo «Conteo».'
              : `${result.adjusted} frascos ajustados con motivo «Conteo».`,
      });
      onOpenChange(false);
    } catch (error) {
      // Se vuelve a pedir la lista. Un frasco cuyo saldo cambió (alguien registró un movimiento mientras
      // se contaba) pierde lo anotado: reenviarlo con el saldo nuevo contaría ese movimiento dos veces.
      const fresh = await positions.refetch();
      const changed = new Set(
        (fresh.data?.pages.flatMap((page) => page.items) ?? [])
          .filter((p) => sent.has(p.id) && subtractDecimal(p.balance, sent.get(p.id) ?? '') !== '0')
          .map((p) => p.id),
      );
      if (changed.size > 0) {
        setStale(changed);
        setCounts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !changed.has(id))));
        setGeneralError(
          changed.size === 1
            ? 'El saldo de un frasco cambió mientras contabas. Vuelve a contar el frasco marcado.'
            : `El saldo de ${changed.size} frascos cambió mientras contabas. Vuelve a contar los marcados.`,
        );
      } else {
        setGeneralError(commandErrorMessage(error));
      }
    }
  }

  return (
    <FormSheet
      sections
      icon={ClipboardCheck}
      title="Conteo"
      description="Anota lo que hay en cada frasco. Solo los que no cuadran se ajustan, con motivo «Conteo»."
      open={open}
      onOpenChange={onOpenChange}
      // Cuántos no cuadran ya lo dice la lista; un rótulo largo no cabría junto a «Cancelar» en el móvil.
      submitLabel="Registrar conteo"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <Field label="Ubicación">
        <Select
          value={locationId || undefined}
          onValueChange={(value) => {
            setLocationId(value);
            setCounts({});
            setStale(new Set());
            setGeneralError(null);
          }}
          options={(locations.data?.items ?? []).map((location) => ({ value: location.id, label: `${location.name} · ${location.code}` }))}
          placeholder={locations.isPending ? 'Cargando ubicaciones…' : 'Elige qué ubicación vas a contar'}
        />
      </Field>
      {locationId ? (
        positions.isPending || hasNextPage ? (
          <p role="status" className="text-sm text-ink-muted">
            Cargando los frascos de la ubicación…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Esta ubicación no tiene frascos con saldo.</p>
        ) : (
          // Columnas de ancho mínimo cero: una fila larga nunca ensancha la hoja en el móvil.
          <div className="grid min-w-0 grid-cols-1 gap-3">
            <p className="flex flex-wrap justify-between gap-x-3 text-[13px] text-ink-muted" aria-live="polite">
              <span>
                Contados {filled.length} de {rows.length}
              </span>
              <span>{differing.length === 0 ? 'Nada que ajustar' : differing.length === 1 ? '1 no cuadra' : `${differing.length} no cuadran`}</span>
            </p>
            <ul className="grid min-w-0 grid-cols-1 gap-2">
              {rows.map((p) => {
                const code = p.container?.code ?? p.lot.code;
                const raw = counts[p.id] ?? '';
                const delta = raw.trim() ? countDelta(raw, p.balance) : null;
                const invalid = raw.trim() !== '' && delta === null;
                const statusId = `conteo-${p.id}`;
                return (
                  <li key={p.id} className="flex min-w-0 items-center gap-3 rounded-control border border-line px-3 py-2">
                    <div className="min-w-0 flex-1">
                      {/* El código identifica el frasco en el estante: nunca se corta; si no cabe, pasa de línea. */}
                      <p className="break-all text-sm font-bold tabular-nums text-ink">{code}</p>
                      <p className="truncate text-[13px] text-ink-muted">{p.product.name}</p>
                      <p className="text-[13px] text-ink-muted">
                        Registrado <Quantity value={p.balance} unit={p.unit} className="font-semibold text-ink" />
                      </p>
                    </div>
                    <div className="w-28 shrink-0 text-right sm:w-32">
                      <div className="relative">
                        <Input
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Contado en ${code}`}
                          aria-invalid={invalid || undefined}
                          aria-describedby={statusId}
                          placeholder="Contado"
                          className="pr-10 text-right tabular-nums"
                          value={raw}
                          onChange={(event) => {
                            setCounts((current) => ({ ...current, [p.id]: event.target.value }));
                            if (stale.has(p.id)) setStale((current) => new Set([...current].filter((id) => id !== p.id)));
                          }}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[13px] text-ink-muted">{p.unit}</span>
                      </div>
                      <p id={statusId} className="mt-1 min-h-5 text-[13px] tabular-nums">
                        {raw.trim() === '' ? (
                          stale.has(p.id) ? <span className="text-warning">El saldo cambió: vuelve a contarlo</span> : null
                        ) : delta === null ? (
                          <span className="text-danger">Cantidad no válida</span>
                        ) : delta === '0' ? (
                          <span className="text-ink-muted">Cuadra</span>
                        ) : (
                          <Quantity value={delta} unit={p.unit} signed className="font-semibold text-action [&>span]:text-current" />
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      ) : null}
    </FormSheet>
  );
}
