import type { Asset, AssetEvent, Fault } from '@platlab/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { useState, type ReactNode } from 'react';
import { formatDate, formatDateTime, formatDayInZone } from '../../app/format';
import { PrintDialog, printCell, printHead } from '../../app/print-dialog';
import { PRINT_LIMIT, usePrintRows } from '../../app/print-rows';
import { QueryErrorState } from '../../app/states';
import { describeEvent } from './asset-history';
import { formatMoney, todayIn, usefulLifeText, warrantyText } from './asset-facts';
import { availabilityLabel, conditionLabel, conservationLabel, placeLines } from './asset-text';
import { useEquipment } from './context';
import { faultStatusOrder, faultTypeLabel, personText } from './fault-text';
import { faultOutcome, limitNote, oldestFirst, usableThenText } from './life-record';
import { useAsset, useAssetHistory, useFaults } from './queries';

const NO_DATA = 'Sin dato';
const NONE = '—';

const faultColumns = ['Reportado', 'Tipo', 'Qué pasó', '¿Se podía usar?', 'Reportó', 'Qué se hizo', 'Solucionó', 'Tardó'];
const historyColumns = ['Fecha', 'Hecho', 'Detalle', 'Quién'];
/** El título de cada sección y de cada firma: una línea fina debajo. */
const sectionTitle = 'mb-2 border-b border-line pb-1 text-[13px] font-bold uppercase tracking-wider';

/** Los incidentes ya traídos (todas sus páginas, hasta `PRINT_LIMIT`) con la consulta de la que salen. */
interface FaultRows {
  query: ReturnType<typeof useFaults>;
  rows: Fault[];
  hasMore: boolean;
  loadingMore: boolean;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-5 first:mt-0">
      <h3 className={sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 break-inside-avoid">
      <dt className="text-[11px] text-ink-muted">{label}</dt>
      <dd className="break-words text-[12px] font-medium leading-snug">{children}</dd>
    </div>
  );
}

function Fields({ children }: { children: ReactNode }) {
  return <dl className="grid min-w-0 flex-1 grid-cols-3 gap-x-4 gap-y-2">{children}</dl>;
}

/** Lo que dice una tabla sin filas. */
function Empty({ children }: { children: string }) {
  return <p className="py-2 text-[12px] text-ink-muted">{children}</p>;
}

function Note({ count, hasMore }: { count: number; hasMore: boolean }) {
  const note = limitNote(count, hasMore);
  return note ? <p className="mt-2 text-[12px] font-medium">{note}</p> : null;
}

function IdentitySection({ asset, timeZone }: { asset: Asset; timeZone: string }) {
  const today = todayIn(timeZone);
  return (
    <>
      <Section title="Identificación">
        <div className="flex items-start gap-4">
          {asset.photoUrl ? (
            <img src={asset.photoUrl} alt="" decoding="async" className="size-20 shrink-0 rounded-control border border-line object-contain p-1" />
          ) : null}
          <Fields>
            <Field label="Código">
              <span className="font-mono tabular-nums">{asset.code}</span>
            </Field>
            <Field label="Nombre">{asset.name}</Field>
            <Field label="Tipo">{asset.type.name}</Field>
            <Field label="Marca">{asset.brand ?? NO_DATA}</Field>
            <Field label="Modelo">{asset.model ?? NO_DATA}</Field>
            <Field label="Serie">{asset.serialNumber ?? NO_DATA}</Field>
            <Field label="Alimentación">{asset.powerSupply ?? NO_DATA}</Field>
            <Field label="Ubicación">{placeLines(asset.location).full}</Field>
            <Field label="Responsable">{asset.responsible?.name ?? 'Sin responsable'}</Field>
          </Fields>
        </div>
      </Section>
      <Section title="Compra y garantía">
        <Fields>
          <Field label="Proveedor">{asset.supplier ?? NO_DATA}</Field>
          <Field label="Fecha de compra">{asset.acquiredOn ? formatDate(asset.acquiredOn) : NO_DATA}</Field>
          <Field label="Valor de reposición">{asset.replacementValue ? formatMoney(asset.replacementValue) : NO_DATA}</Field>
          <Field label="Garantía">
            {warrantyText(asset.warrantyUntil, today)}
          </Field>
          <Field label="Vida útil">{usefulLifeText(asset.acquiredOn, asset.usefulLifeYears, today)}</Field>
        </Fields>
      </Section>
      <Section title="Estado actual">
        <Fields>
          <Field label="Estado">{conditionLabel[asset.condition]}</Field>
          <Field label="Estado físico">{asset.conservation ? conservationLabel[asset.conservation] : NO_DATA}</Field>
          <Field label="Disponibilidad">{availabilityLabel[asset.availability]}</Field>
        </Fields>
      </Section>
    </>
  );
}

function FaultsSection({ faults, timeZone }: { faults: FaultRows; timeZone: string }) {
  const { rows, hasMore } = faults;
  return (
    <Section title={`Incidentes (${rows.length})`}>
      {rows.length === 0 ? (
        <Empty>Sin incidentes registrados</Empty>
      ) : (
        <Table className="text-[12px]">
          <caption className="sr-only">Incidentes del equipo, del más antiguo al más reciente</caption>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              {faultColumns.map((title) => (
                <TableHeader key={title} className={printHead}>
                  {title}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {oldestFirst(rows).map((fault) => {
              const outcome = faultOutcome(fault);
              return (
                <TableRow key={fault.id} className="break-inside-avoid hover:bg-transparent">
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{formatDayInZone(fault.reportedAt, timeZone)}</TableCell>
                  <TableCell className={printCell}>{faultTypeLabel[fault.faultType]}</TableCell>
                  <TableCell className={printCell}>{fault.description}</TableCell>
                  <TableCell className={printCell}>{usableThenText(fault.usable)}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{personText(fault.reportedBy)}</TableCell>
                  <TableCell className={printCell}>{outcome.done}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{outcome.solvedBy}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{outcome.took}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Note count={rows.length} hasMore={hasMore} />
    </Section>
  );
}

// El hecho trae sus párrafos de la ficha (13 px, gris): en la hoja heredan el tamaño de la celda y la tinta.
const eventCell = cn(printCell, '[&_p]:text-[length:inherit] [&_p]:text-ink');

function HistorySection({ events, timeZone }: { events: AssetEvent[]; timeZone: string }) {
  return (
    <Section title={`Historial (${events.length})`}>
      {events.length === 0 ? (
        <Empty>Sin hechos</Empty>
      ) : (
        <Table className="text-[12px]">
          <caption className="sr-only">Historial del equipo, del más antiguo al más reciente</caption>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              {historyColumns.map((title) => (
                <TableHeader key={title} className={printHead}>
                  {title}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {oldestFirst(events).map((event, index, all) => {
              const { title, details } = describeEvent(event);
              return (
                <TableRow
                  key={`${event.kind}-${event.occurredAt}-${index}`}
                  // Las últimas filas no se separan de las firmas, que no viajan solas a otra página.
                  className={cn('break-inside-avoid hover:bg-transparent', index >= all.length - 2 && 'break-after-avoid')}
                >
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{formatDayInZone(event.occurredAt, timeZone)}</TableCell>
                  <TableCell className={eventCell}>{title}</TableCell>
                  <TableCell className={eventCell}>{details}</TableCell>
                  <TableCell className={cn(printCell, 'whitespace-nowrap')}>{event.actor ?? NONE}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Note count={events.length} hasMore={false} />
    </Section>
  );
}

/** Una línea en blanco con su rótulo. */
function SignatureLine({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('flex items-end gap-2 text-[12px]', className)}>
      <span className="shrink-0 text-ink-muted">{label}</span>
      <span className={cn('flex-1 border-b border-ink', label === 'Firma' ? 'h-12' : 'h-6')} aria-hidden />
    </div>
  );
}

/** «Elaborado por» y «Revisado por», lado a lado: nombre y fecha en una fila, la firma sola y más alta, todo en blanco. */
function Signatures() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-8 break-inside-avoid">
      {['Elaborado por', 'Revisado por'].map((title) => (
        <section key={title} aria-label={title}>
          <h3 className={sectionTitle}>{title}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <SignatureLine label="Nombre" />
            <SignatureLine label="Fecha" />
            <SignatureLine label="Firma" className="col-span-2" />
          </div>
        </section>
      ))}
    </div>
  );
}

/** El diálogo y la hoja con lo que ya se cargó; `faults` es nulo cuando quien imprime no ve los incidentes. */
function LifeRecordSheet({
  asset,
  history,
  faults,
  onClose,
}: {
  asset: ReturnType<typeof useAsset>;
  history: ReturnType<typeof useAssetHistory>;
  faults: FaultRows | null;
  onClose: () => void;
}) {
  const { me } = useEquipment();
  const timeZone = me.workspace.timeZone;
  const [printedAt] = useState(() => new Date().toISOString());

  const faultsReady = !faults || (faults.query.isSuccess && !faults.query.isPlaceholderData && !faults.loadingMore);
  const failed = [asset, history, faults?.query].find((query) => query?.isError);

  return (
    <PrintDialog
      workspaceName={me.workspace.name}
      title="Hoja de vida del equipo"
      facts={[
        {
          term: 'Equipo',
          detail: asset.data ? (
            <>
              <span className="font-mono tabular-nums">{asset.data.code}</span> · {asset.data.name}
            </>
          ) : (
            'Cargando…'
          ),
        },
        { term: 'Impreso', detail: `${formatDateTime(printedAt, timeZone)} · ${me.member.displayName}` },
      ]}
      closeLabel="Volver a la ficha"
      loadingText="Cargando la hoja de vida…"
      ready={asset.isSuccess && history.isSuccess && faultsReady}
      failed={Boolean(failed)}
      hasContent={asset.isSuccess}
      onClose={onClose}
    >
      {failed ? (
        <QueryErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      ) : asset.isSuccess && history.isSuccess && faultsReady ? (
        <>
          <IdentitySection asset={asset.data} timeZone={timeZone} />
          {faults ? <FaultsSection faults={faults} timeZone={timeZone} /> : null}
          <HistorySection events={history.data.items} timeZone={timeZone} />
          <Signatures />
        </>
      ) : (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando…</p>
      )}
    </PrintDialog>
  );
}

/** Los incidentes, que solo se piden a quien los ve: la consulta no puede quedar a medias, así que vive en su propio componente. */
function WithFaults({
  workspaceId,
  assetId,
  ...sheet
}: {
  workspaceId: string;
  assetId: string;
  asset: ReturnType<typeof useAsset>;
  history: ReturnType<typeof useAssetHistory>;
  onClose: () => void;
}) {
  const query = useFaults(workspaceId, { statuses: faultStatusOrder, assetId }, 100);
  const { rows, hasMore, loadingMore } = usePrintRows(query);
  return <LifeRecordSheet {...sheet} faults={{ query, rows, hasMore, loadingMore }} />;
}

/**
 * Vista imprimible de la Hoja de vida del equipo (E-01f, ADR 0019): A4 vertical con la identificación, la compra y
 * la garantía, el estado actual, los incidentes y el historial de toda la vida del equipo (hasta 1.000 de cada
 * uno, del más antiguo al más reciente) y, al pie, las firmas de quien elabora y de quien revisa. Reutiliza los
 * cachés de la ficha; el diálogo y la hoja son los de `PrintDialog`. Quien no ve los incidentes imprime sin esa tabla.
 */
export function LifeRecordPrint({ assetId, seesFaults, onClose }: { assetId: string; seesFaults: boolean; onClose: () => void }) {
  const { workspaceId } = useEquipment();
  const asset = useAsset(workspaceId, assetId);
  const history = useAssetHistory(workspaceId, assetId, true, PRINT_LIMIT);
  return seesFaults ? (
    <WithFaults workspaceId={workspaceId} assetId={assetId} asset={asset} history={history} onClose={onClose} />
  ) : (
    <LifeRecordSheet asset={asset} history={history} faults={null} onClose={onClose} />
  );
}
