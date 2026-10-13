import type { Position } from '@platlab/contracts';
import { Band, Button, Quantity, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { ArrowUpFromLine, Building2, Calendar, Check, MapPin, QrCode as QrIcon } from 'lucide-react';
import { formatGrams, gramsPerUnit, weightFigures } from './weight';
import { type ReactNode } from 'react';
import { addDays, formatDate, formatInstantDate, relativeDays } from '../../app/format';
import { type Allowed, type SheetRequest } from './context';
import { InfoPill } from './pills';
import { availableOf } from './stock';

/** Dato de una pastilla del frasco: el rótulo atenuado y el valor en negrita. */
function PillValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="font-normal">{label}</span>
      <span className="font-bold">{children}</span>
    </>
  );
}

/**
 * Control por peso del frasco (ADR 0015): con tara, Tara · Peso neto · Bruto esperado en g; sin ella,
 * quien ajusta la fija. Los pesos no son cantidades de inventario: son vista previa del servidor.
 */
function WeightRow({ position, canSet, onAction }: { position: Position; canSet: boolean; onAction: (request: SheetRequest) => void }) {
  const figures = weightFigures(position);
  // Solo se pesan g, kg, mL y L (en volumen, con densidad: la pide la hoja).
  const weighable = gramsPerUnit(position.unit, '1') !== null && position.container !== null;
  const setTare = () => onAction({ kind: 'tare', position });
  if (figures) {
    return (
      <div className="grid gap-1">
        {/* Tres datos en una línea; si no caben, envuelven por dato y no por palabra. */}
        <dl className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[12px] tabular-nums">
          {(
            [
              ['Tara', figures.tare],
              ['Neto', figures.net],
              ['Bruto', figures.expectedGross],
            ] as const
          ).map(([label, grams]) => (
            <div key={label} className="flex gap-1 whitespace-nowrap">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="font-bold text-ink">{formatGrams(grams)}</dd>
            </div>
          ))}
        </dl>
        {canSet ? (
          <button type="button" onClick={setTare} className="-mx-1 min-h-[44px] justify-self-start rounded-[6px] px-1 text-[13px] font-medium text-action hover:text-action-hover sm:min-h-0">
            Cambiar tara
          </button>
        ) : null}
      </div>
    );
  }
  if (!canSet || !weighable) return null;
  return (
    <button
      type="button"
      onClick={setTare}
      className="-mx-1 inline-flex min-h-[44px] items-center self-start rounded-[6px] px-1 text-left text-[13px] text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-action hover:decoration-action sm:min-h-0 sm:py-0.5"
    >
      Fijar tara para controlar con la balanza
    </button>
  );
}

/**
 * Un frasco en la ficha (ADR 0012; ADR 0010, «Ventanas como ReactiLab»): translúcido sin desenfoque
 * (`bg-white/80`, borde suave, radio de 24 px). Arriba el código y, en pastillas, la ubicación y la
 * marca; el saldo grande con la unidad gris; la barra por nivel con la cantidad inicial; «Ingresó» y
 * «Vence» en pastillas (y lo apartado, si lo hay); la línea de pesos; y, tras una línea de borde a
 * borde, las acciones. El color solo cuenta un estado y siempre con texto: verde el borde del que
 * conviene usar primero (FEFO), rojo el vencido.
 */
export function ContainerCard({
  position,
  today,
  timeZone,
  allowed,
  recommended,
  scanned = false,
  onAction,
}: {
  position: Position;
  today: string;
  timeZone: string;
  allowed: Allowed;
  recommended: boolean;
  /** Se llegó a la ficha desde la etiqueta QR de este frasco (ADR 0012, entrega 4). */
  scanned?: boolean;
  onAction: (request: SheetRequest) => void;
}) {
  const initial = position.container?.initialQuantity ?? null;
  const percent = initial ? ratioPercent(position.balance, initial) : null;
  const empty = position.balance === '0';
  const { expiresOn } = position.lot;
  const expired = expiresOn !== null && expiresOn < today;
  // Lo apartado por solicitudes no se puede sacar (ADR 0012); con todo apartado, no hay «Salida».
  const reserved = position.reserved !== '0';
  const available = availableOf(position);
  // Con saldo pero menos del 1 %, se dice y se ve: un frasco casi vacío no es un frasco vacío.
  const percentText = percent === 0 && !empty ? '<1 %' : `${percent ?? 0} %`;
  const canIssue = allowed.issue && available !== '0';
  // Se traslada el frasco entero; con salidas pendientes, primero se resuelven (ADR 0012, entrega 4).
  const canTransfer = allowed.transfer && !empty && !reserved;
  const { brand } = position.lot;
  const soon = expiresOn !== null && !expired && expiresOn <= addDays(today, 30);
  return (
    <article
      id={position.container ? `frasco-${position.container.id}` : undefined}
      aria-current={scanned ? 'true' : undefined}
      className={cn(
        // Translúcido y sin desenfoque; el color solo cuenta un estado y siempre con texto (ADR 0010).
        'group relative flex h-full flex-col gap-4 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5',
        scanned && 'scroll-mt-24 ring-2 ring-action',
        !scanned && recommended && 'ring-2 ring-success/50',
        !scanned && !recommended && expired && 'ring-1 ring-danger/40',
      )}
    >
      {scanned ? (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-action px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
          <QrIcon className="size-3" aria-hidden />
          Desde su etiqueta
        </span>
      ) : null}
      {recommended ? (
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-on-action shadow-sm">
          <Check className="size-3" aria-hidden />
          FEFO
          <span className="sr-only"> (vence antes: conviene usarlo primero)</span>
        </span>
      ) : null}
      <div className="grid gap-2.5">
        {/* El código es la identidad de la etiqueta: nunca se parte. */}
        <h3 className="whitespace-nowrap text-lg font-bold tabular-nums leading-tight text-ink">
          {position.container?.code ?? position.lot.code}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <InfoPill>
            <MapPin aria-hidden />
            <span className="truncate">{position.location.name}</span>
          </InfoPill>
          {brand ? (
            <InfoPill>
              <Building2 aria-hidden />
              <span className="truncate">{brand}</span>
            </InfoPill>
          ) : null}
          {expiresOn === null ? (
            <InfoPill tone="warning">
              <Calendar aria-hidden />
              Caducidad sin confirmar
            </InfoPill>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2.5">
        <p className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-4xl font-bold leading-none tracking-tight tabular-nums',
              empty ? 'text-ink-subtle' : 'text-action',
            )}
          >
            {formatDecimal(position.balance)}
          </span>
          <span className="text-base text-ink-muted">{position.unit}</span>
        </p>
        {percent !== null && initial ? (
          <div className="grid gap-1.5">
            <StockLevelBar
              percent={percent}
              hasStock={!empty}
              label={`Queda ${percentText === '<1 %' ? 'menos del 1 %' : `el ${percentText}`} de lo que entró`}
            />
            <p className="flex justify-between text-[12px] text-ink-muted">
              <span>
                Inicial: <Quantity value={initial} unit={position.unit} />
              </span>
              <span className="font-semibold tabular-nums">{percentText}</span>
            </p>
          </div>
        ) : null}
      </div>
      {/* El lote interno ya es el prefijo del código del frasco: no se repite. */}
      <div className="flex flex-wrap gap-1.5">
        {position.container ? (
          <InfoPill>
            <PillValue label="Ingresó">{formatInstantDate(position.container.receivedAt, timeZone)}</PillValue>
          </InfoPill>
        ) : null}
        {expiresOn ? (
          <InfoPill tone={expired ? 'danger' : soon ? 'warning' : 'neutral'} title={formatDate(expiresOn)}>
            <PillValue label={expired ? 'Venció' : 'Vence'}>
              {relativeDays(expiresOn, today)}
              <span className="sr-only"> ({formatDate(expiresOn)})</span>
            </PillValue>
          </InfoPill>
        ) : null}
        {reserved ? (
          <>
            <InfoPill tone="accent">
              <PillValue label="Apartado">
                <Quantity value={position.reserved} unit={position.unit} unitClassName="text-inherit" />
              </PillValue>
            </InfoPill>
            <InfoPill>
              <PillValue label="Disponible">
                <Quantity value={available} unit={position.unit} className="text-ink" unitClassName="text-inherit" />
              </PillValue>
            </InfoPill>
          </>
        ) : null}
      </div>
      <WeightRow position={position} canSet={allowed.adjustment} onAction={onAction} />
      {canIssue || canTransfer || allowed.adjustment ? (
        // Banda inferior de borde a borde: «Salida» es la primaria; «Trasladar» y «Ajustar», texto.
        <Band ruled className="-mx-5 -mb-1 mt-auto flex flex-wrap items-center gap-1.5 px-5 pt-4">
          {canIssue ? (
            // Relleno solo el frasco que conviene usar primero: la acción primaria de la ficha es una.
            <Button
              size="sm"
              variant={recommended ? 'primary' : 'secondary'}
              className={cn('h-10 min-w-[6.5rem] flex-1 rounded-xl font-bold', !recommended && 'border-action/30 bg-white/70 text-action hover:bg-action-soft')}
              onClick={() => onAction({ kind: 'issue', positionId: position.id })}
            >
              <ArrowUpFromLine aria-hidden />
              {/* Quien no aprueba pide la salida: la tarjeta no promete una acción inmediata (ADR 0012). */}
              {allowed.approve ? 'Salida' : 'Solicitar salida'}
            </Button>
          ) : null}
          {canTransfer ? (
            <Button
              size="sm"
              variant="ghost"
              title="Trasladar el frasco a otra ubicación"
              className="h-10 rounded-xl px-2.5"
              onClick={() => onAction({ kind: 'transfer', position })}
            >
              Trasladar
            </Button>
          ) : null}
          {allowed.adjustment ? (
            <Button
              size="sm"
              variant="ghost"
              title="Ajustar existencias"
              className="h-10 rounded-xl px-2.5"
              onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}
            >
              Ajustar
            </Button>
          ) : null}
        </Band>
      ) : null}
    </article>
  );
}
