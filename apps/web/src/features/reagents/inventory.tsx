import type { Position, StockedProduct } from '@platlab/contracts';
import { Badge, Button, IconChip, Input, Quantity, Skeleton, StatePanel, cn, ratioPercent } from '@platlab/ui';
import {
  ArrowUpFromLine,
  Box,
  CircleAlert,
  Droplet,
  FlaskConical,
  History,
  Layers,
  Plus,
  Scale,
  Search,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { formatDate } from '../../app/format';
import { useOperations, usePositions, useProduct } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { useReagents, type Allowed, type SheetRequest } from './context';
import { purposeOf, responsibleOf } from './operation-text';
import { availableOf } from './stock';

const physicalStateLabel: Record<string, string> = { solid: 'Sólido', liquid: 'Líquido', gas: 'Gas' };

/** El icono lo da el estado físico, un dato que ya existe; sin él, el matraz del módulo. */
const physicalStateIcon: Record<string, LucideIcon> = { solid: Box, liquid: Droplet, gas: Wind };

const matches = (product: StockedProduct, query: string) => {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return [product.name, product.code, product.casNumber ?? ''].some((value) => value.toLowerCase().includes(text));
};

/** Interruptor «mostrar vacíos» de ReactiLab: lo que no tiene saldo se oculta, pero no desaparece. */
function EmptyToggle({ count, shown, onToggle, noun }: { count: number; shown: boolean; onToggle: () => void; noun: string }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors',
        shown ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
      )}
    >
      {shown ? 'Ocultar' : 'Mostrar'} {noun} ({count})
    </button>
  );
}

/**
 * Inventario, primer nivel (ADR 0012): un reactivo por tarjeta con su total y sus frascos con
 * saldo. Toda la tarjeta abre su ficha, el segundo nivel.
 */
export function ReagentsInventoryPage() {
  const { base, allowed, products, productList, openSheet } = useReagents();
  const [query, setQuery] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const emptyCount = productList.filter((product) => product.balance === '0').length;
  const visible = productList.filter((product) => matches(product, query) && (showEmpty || product.balance !== '0'));

  if (products.isPending) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4" role="status" aria-busy="true" aria-label="Cargando">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-52 rounded-card" />
        ))}
      </div>
    );
  }
  if (productList.length === 0) {
    return (
      <div className="rounded-card bg-surface shadow-raised">
        <StatePanel
          icon={FlaskConical}
          title="Aún no hay reactivos"
          description={
            allowed.product
              ? 'Crea el primer reactivo del catálogo; después registra sus frascos con un ingreso.'
              : 'Cuando alguien con permiso cree reactivos en el catálogo, aparecerán aquí.'
          }
          action={
            allowed.product ? (
              <Button variant="primary" onClick={() => openSheet({ kind: 'product' })}>
                <Plus aria-hidden />
                Nuevo reactivo
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar reactivo por nombre, código o CAS"
            placeholder="Buscar por nombre, código o CAS"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="sin existencias" />
      </div>
      {visible.length === 0 ? (
        <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
          Ningún reactivo coincide con «{query}».
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} to={`${base}/inventario/${product.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Tarjeta de catálogo (ADR 0010, 04-10-2026): chip de icono, rótulo y CAS, nombre, y abajo la cifra
 * principal en el acento del módulo con su píldora. El color es el del módulo; un reactivo sin
 * existencias pasa a neutro y ámbar, que son estados y se dicen también con texto.
 */
function ProductCard({ product, to }: { product: StockedProduct; to: string }) {
  const empty = product.balance === '0';
  const state = product.physicalState ?? undefined;
  const frascos = product.containersWithStock === 1 ? '1 frasco' : `${product.containersWithStock} frascos`;
  return (
    <Link
      to={to}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-card bg-surface p-6 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-1"
    >
      {/* Marca de agua, como en ReactiLab: decorativa y casi invisible. */}
      <FlaskConical
        className="pointer-events-none absolute -bottom-5 -right-5 size-32 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <IconChip icon={(state && physicalStateIcon[state]) || FlaskConical} tone={empty ? 'neutral' : 'accent'} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            <span>{(state && physicalStateLabel[state]) ?? 'Reactivo'}</span>
            {product.casNumber ? (
              <span className="ml-auto font-medium normal-case tracking-normal tabular-nums">CAS {product.casNumber}</span>
            ) : null}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-ink transition-colors group-hover:text-action">{product.name}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{product.code}</p>
        </div>
      </div>
      <div className="relative mt-auto border-t border-line pt-4">
        {/* La píldora comparte fila con «Total»: la cifra siempre tiene su propia línea y todas las
            tarjetas tienen la misma estructura, sea cual sea el ancho del número. */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Total</p>
          <Badge tone={empty ? 'warning' : 'info'} className="gap-1.5 whitespace-nowrap px-2.5 py-1 text-[13px]">
            {empty ? <CircleAlert className="size-4" aria-hidden /> : <Layers className="size-4" aria-hidden />}
            {empty ? 'Sin existencias' : frascos}
          </Badge>
        </div>
        <Quantity
          value={product.balance}
          unit={product.baseUnit}
          // Un saldo muy largo baja la unidad a otra línea en lugar de salirse de la tarjeta.
          className={cn('mt-1.5 block whitespace-normal text-3xl font-bold tracking-tight', empty ? 'text-ink-subtle' : 'text-action')}
        />
      </div>
    </Link>
  );
}

const conditionLabel: Record<Position['lot']['condition'], { text: string; tone: 'warning' | 'danger' } | null> = {
  enabled: null,
  quarantine: { text: 'Lote en cuarentena', tone: 'warning' },
  blocked: { text: 'Lote bloqueado', tone: 'danger' },
  discarded: { text: 'Lote descartado', tone: 'danger' },
};

/** Caducidad con texto, nunca solo con color: vencido, fecha o «sin confirmar» (01 §6.1). */
function ExpiryBadge({ expiresOn, today }: { expiresOn: string | null; today: string }) {
  if (expiresOn === null) return <Badge tone="warning">Caducidad sin confirmar</Badge>;
  if (expiresOn < today) return <Badge tone="danger">Venció el {formatDate(expiresOn)}</Badge>;
  return <Badge>Caduca {formatDate(expiresOn)}</Badge>;
}

/**
 * Un frasco en la ficha (ADR 0012): código, lote y ubicación, caducidad, lo que queda frente a lo
 * que entró y sus acciones. La barra mide el % restante con aritmética exacta.
 */
function ContainerCard({
  position,
  today,
  allowed,
  onAction,
}: {
  position: Position;
  today: string;
  allowed: Allowed;
  onAction: (request: SheetRequest) => void;
}) {
  const initial = position.container?.initialQuantity ?? null;
  const percent = initial ? ratioPercent(position.balance, initial) : null;
  const empty = position.balance === '0';
  // Lo apartado por solicitudes no se puede sacar (ADR 0012); con todo apartado, no hay «Salida».
  const reserved = position.reserved !== '0';
  const available = availableOf(position);
  // Con saldo pero menos del 1 %, se dice y se ve: un frasco casi vacío no es un frasco vacío.
  const percentText = percent === 0 && !empty ? '<1 %' : `${percent ?? 0} %`;
  const condition = conditionLabel[position.lot.condition];
  return (
    <article className="flex h-full flex-col gap-4 rounded-card bg-surface p-5 shadow-raised">
      {/* El código es la identidad de la etiqueta: nunca se parte; si no cabe, el saldo baja. La
          ubicación va en su propia línea para que el saldo quede a la derecha cuando cabe. */}
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="whitespace-nowrap font-semibold tabular-nums text-ink">{position.container?.code ?? position.lot.code}</h3>
          <Quantity
            value={position.balance}
            unit={position.unit}
            className={cn('text-lg font-semibold', empty ? 'text-ink-subtle' : 'text-ink')}
          />
        </div>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          {position.location.name} · {position.location.code}
        </p>
      </header>
      <div className="flex flex-wrap gap-1.5">
        <ExpiryBadge expiresOn={position.lot.expiresOn} today={today} />
        {condition ? <Badge tone={condition.tone}>{condition.text}</Badge> : null}
        {reserved ? (
          <Badge tone="info">
            <Quantity value={position.reserved} unit={position.unit} /> apartados
          </Badge>
        ) : null}
      </div>
      {percent !== null && initial ? (
        <div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="img"
            aria-label={`Queda ${percentText === '<1 %' ? 'menos del 1 %' : `el ${percentText}`} de lo que entró`}
          >
            <div
              className={cn('h-full rounded-full', percent <= 20 ? 'bg-warning' : 'bg-action')}
              style={{ width: percent === 0 && !empty ? '4px' : `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 flex justify-between text-[12px] text-ink-muted">
            <span>
              Entró con <Quantity value={initial} unit={position.unit} />
            </span>
            <span className="tabular-nums">{percentText}</span>
          </p>
        </div>
      ) : null}
      {(allowed.issue && available !== '0') || allowed.adjustment ? (
        <div className="mt-auto flex gap-2 border-t border-line pt-3">
          {allowed.issue && available !== '0' ? (
            <Button size="sm" className="flex-1 max-lg:h-11" onClick={() => onAction({ kind: 'issue', positionId: position.id })}>
              <ArrowUpFromLine aria-hidden />
              Salida
            </Button>
          ) : null}
          {allowed.adjustment ? (
            <Button size="sm" className="max-lg:h-11" onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}>
              <Scale aria-hidden />
              Ajustar
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Ficha del reactivo, segundo nivel (ADR 0012, 01 §7): su total, sus frascos y su historial. Las
 * acciones de cada frasco abren las mismas hojas que la cabecera, con el frasco ya elegido.
 */
export function ReagentsProductPage() {
  const { productId = '' } = useParams();
  const { workspaceId, me, allowed, openSheet } = useReagents();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const history = useOperations(workspaceId, { productId });
  const [showEmpty, setShowEmpty] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.workspace.timeZone }).format(new Date());
  const containers = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const emptyCount = containers.filter((position) => position.balance === '0').length;
  const visible = containers.filter((position) => showEmpty || position.balance !== '0');
  const entries = history.data?.pages.flatMap((page) => page.items).slice(0, 10) ?? [];

  if (product.isPending) {
    return (
      <div className="grid gap-4" role="status" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
      </div>
    );
  }
  if (product.isError) {
    return (
      <QueryErrorState error={product.error} onRetry={() => void product.refetch()} />
    );
  }

  const facts = [
    { label: 'Código', value: product.data.code },
    { label: 'CAS', value: product.data.casNumber ?? 'Sin CAS' },
    { label: 'Estado físico', value: product.data.physicalState ? physicalStateLabel[product.data.physicalState] : 'Sin indicar' },
  ];

  return (
    <div className="grid gap-6">
      <section aria-label="Resumen del reactivo" className="grid gap-4 rounded-card bg-surface p-5 shadow-raised sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-8">
        <div>
          <p className="text-sm text-ink-muted">Existencia</p>
          <Quantity value={product.data.balance} unit={product.data.baseUnit} className="text-metric-sm text-ink" />
          <p className="text-[13px] text-ink-muted">
            {product.data.containersWithStock === 1 ? '1 frasco con saldo' : `${product.data.containersWithStock} frascos con saldo`}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm lg:border-l lg:border-line lg:pl-8">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[13px] text-ink-muted">{fact.label}</dt>
              <dd className="truncate font-medium text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="frascos" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="frascos" className="text-lg font-semibold text-ink">
            Frascos
          </h2>
          <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="vacíos" />
        </div>
        {positions.isPending ? (
          <Skeleton className="h-44 rounded-card" />
        ) : positions.isError ? (
          <QueryErrorState error={positions.error} onRetry={() => void positions.refetch()} />
        ) : visible.length === 0 ? (
          <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
            {containers.length === 0 ? 'Este reactivo aún no tiene frascos. Regístralos con un ingreso.' : 'Todos sus frascos están vacíos.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
            {visible.map((position) => (
              <li key={position.id}>
                <ContainerCard position={position} today={today} allowed={allowed} onAction={openSheet} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial-reactivo" className="rounded-card bg-surface p-5 shadow-raised sm:p-6">
        <h2 id="historial-reactivo" className="text-lg font-semibold text-ink">
          Historial del reactivo
        </h2>
        {history.isPending ? (
          <Skeleton className="mt-4 h-24" />
        ) : history.isError ? (
          <QueryErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : entries.length === 0 ? (
          <StatePanel icon={History} title="Sin movimientos" description="Cada ingreso, salida o ajuste quedará aquí con su responsable." />
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {entries.map((operation) => (
              <li key={operation.entryId} className="py-3">
                <ActivityRow
                  type={operation.type}
                  title={operation.container?.code ?? operation.lot.code}
                  detail={[operation.location.code, purposeOf(operation)].filter(Boolean).join(' · ')}
                  quantity={operation.quantity}
                  unit={operation.unit}
                  occurredAt={operation.effectiveAt}
                  actor={responsibleOf(operation)}
                  timeZone={me.workspace.timeZone}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
