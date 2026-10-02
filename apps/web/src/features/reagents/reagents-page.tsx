import type { Operation, Position, ProductList } from '@platlab/contracts';
import {
  Badge,
  Button,
  Quantity,
  Skeleton,
  StatePanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@platlab/ui';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { ArrowDownToLine, ArrowUpFromLine, Eye, FlaskConical, History, Plus, RefreshCw, Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useShell } from '../../app/app-shell';
import { formatAgo, formatDate, formatDateTime } from '../../app/format';
import { useOperations, usePositions, useProducts } from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { AdjustmentSheet, IssueSheet, NewLotSheet, NewProductSheet, ReceiptSheet } from './sheets';

type SheetRequest =
  | { kind: 'product' }
  | { kind: 'lot'; productId?: string }
  | { kind: 'receipt'; productId?: string }
  | { kind: 'issue'; positionId?: string }
  | { kind: 'adjustment'; positionId?: string };

/**
 * La hoja se monta de nuevo en cada apertura (clave nueva: formulario limpio y clave idempotente
 * nueva) y sigue montada al cerrarse para que su salida pueda animarse.
 */
function useSheets() {
  const [state, setState] = useState<{ open: boolean; id: number; request: SheetRequest } | null>(null);
  return {
    current: state,
    open: (request: SheetRequest) => setState((previous) => ({ open: true, id: (previous?.id ?? 0) + 1, request })),
    close: () => setState((previous) => (previous ? { ...previous, open: false } : previous)),
  };
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function ReagentsPage() {
  const { workspaceId, me } = useShell();
  const products = useProducts(workspaceId);
  const positions = usePositions(workspaceId);
  const operations = useOperations(workspaceId);
  const sheets = useSheets();
  const now = useNow(15_000);

  const module = me.modules.find((entry) => entry.code === 'reagents');
  const canOperate = module?.access.includes('new_operation') ?? false;
  const can = (permission: string) => canOperate && me.permissions.includes(permission);
  const allowed = {
    product: can('reagents.catalog.manage'),
    receipt: can('reagents.receipt.create'),
    issue: can('reagents.issue.create'),
    adjustment: can('reagents.adjustment.create'),
  };

  const positionList = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const productList = products.data?.items ?? [];
  const updatedAt = Math.max(positions.dataUpdatedAt, products.dataUpdatedAt);
  const refreshing = positions.isFetching || products.isFetching || operations.isFetching;

  if (products.isError || positions.isError) {
    return (
      <QueryErrorState
        error={products.error ?? positions.error}
        onRetry={() => {
          void products.refetch();
          void positions.refetch();
        }}
      />
    );
  }

  const current = sheets.current;
  const sheetProps = (kind: SheetRequest['kind']) => ({
    workspaceId,
    open: current?.open === true && current.request.kind === kind,
    onOpenChange: (open: boolean) => {
      if (!open) sheets.close();
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Reactivos</h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
            {updatedAt > 0 ? <span>Actualizado {formatAgo(updatedAt, now)}</span> : <span>Cargando…</span>}
            <button
              type="button"
              onClick={() => {
                void products.refetch();
                void positions.refetch();
                void operations.refetch();
              }}
              className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-medium text-action transition-colors hover:bg-action-soft"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowed.product ? (
            <Button onClick={() => sheets.open({ kind: 'product' })}>
              <Plus aria-hidden />
              Nuevo reactivo
            </Button>
          ) : null}
          {allowed.receipt ? (
            <Button onClick={() => sheets.open({ kind: 'receipt' })}>
              <ArrowDownToLine aria-hidden />
              Registrar ingreso
            </Button>
          ) : null}
          {allowed.adjustment && positionList.length > 0 ? (
            <Button onClick={() => sheets.open({ kind: 'adjustment' })}>
              <Scale aria-hidden />
              Ajustar
            </Button>
          ) : null}
          {allowed.issue && positionList.length > 0 ? (
            <Button variant="primary" className="order-first md:order-none" onClick={() => sheets.open({ kind: 'issue' })}>
              <ArrowUpFromLine aria-hidden />
              Registrar salida
            </Button>
          ) : null}
        </div>
      </header>

      {!canOperate ? (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <Eye className="size-4 shrink-0" aria-hidden />
          Reactivos está en modo consulta: puedes ver el inventario y el historial, pero no registrar movimientos.
        </p>
      ) : null}

      <Tabs defaultValue="inventory" className="mt-6">
        <TabsList>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory">
          <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
            {products.isPending || positions.isPending ? (
              <TableSkeleton />
            ) : productList.length === 0 ? (
              <StatePanel
                icon={FlaskConical}
                title="Aún no hay reactivos"
                description={
                  allowed.product
                    ? 'Crea el primer reactivo del catálogo; después podrás registrar sus lotes e ingresos.'
                    : 'Cuando alguien con permiso cree reactivos en el catálogo, aparecerán aquí.'
                }
                action={
                  allowed.product ? (
                    <Button variant="primary" onClick={() => sheets.open({ kind: 'product' })}>
                      <Plus aria-hidden />
                      Nuevo reactivo
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <InventoryTable
                products={productList}
                positions={positionList}
                allowed={allowed}
                onAction={(request) => sheets.open(request)}
              />
            )}
            {positions.hasNextPage ? (
              <div className="border-t border-line p-3 text-center">
                <Button variant="ghost" size="sm" loading={positions.isFetchingNextPage} onClick={() => void positions.fetchNextPage()}>
                  Cargar más ubicaciones
                </Button>
              </div>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="movements">
          <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
            {operations.isPending ? (
              <TableSkeleton />
            ) : operations.isError ? (
              <QueryErrorState error={operations.error} onRetry={() => void operations.refetch()} />
            ) : (
              <MovementsTable operations={operations.data.pages.flatMap((page) => page.items)} timeZone={me.workspace.timeZone} />
            )}
            {operations.hasNextPage ? (
              <div className="border-t border-line p-3 text-center">
                <Button variant="ghost" size="sm" loading={operations.isFetchingNextPage} onClick={() => void operations.fetchNextPage()}>
                  Cargar movimientos anteriores
                </Button>
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {current?.request.kind === 'product' ? <NewProductSheet key={current.id} {...sheetProps('product')} /> : null}
      {current?.request.kind === 'lot' ? (
        <NewLotSheet key={current.id} {...sheetProps('lot')} products={productList} productId={current.request.productId} />
      ) : null}
      {current?.request.kind === 'receipt' ? (
        <ReceiptSheet key={current.id} {...sheetProps('receipt')} products={productList} productId={current.request.productId} />
      ) : null}
      {current?.request.kind === 'issue' ? (
        <IssueSheet key={current.id} {...sheetProps('issue')} positions={positionList} positionId={current.request.positionId} />
      ) : null}
      {current?.request.kind === 'adjustment' ? (
        <AdjustmentSheet key={current.id} {...sheetProps('adjustment')} positions={positionList} positionId={current.request.positionId} />
      ) : null}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="grid gap-3 p-5" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

type StockedProduct = ProductList['items'][number];

/** Producto → lote → ubicación (01 §7), con el saldo como columna dominante. */
function InventoryTable({
  products,
  positions,
  allowed,
  onAction,
}: {
  products: StockedProduct[];
  positions: Position[];
  allowed: Record<'product' | 'receipt' | 'issue' | 'adjustment', boolean>;
  onAction: (request: SheetRequest) => void;
}) {
  const byProduct = new Map<string, Position[]>();
  for (const position of positions) {
    const list = byProduct.get(position.product.id) ?? [];
    list.push(position);
    byProduct.set(position.product.id, list);
  }

  return (
    <>
      <div className="hidden md:block">
        <InventoryGrid products={products} byProduct={byProduct} allowed={allowed} onAction={onAction} />
      </div>
      <div className="md:hidden">
        <InventoryList products={products} byProduct={byProduct} allowed={allowed} onAction={onAction} />
      </div>
    </>
  );
}

interface InventoryViewProps {
  products: StockedProduct[];
  byProduct: Map<string, Position[]>;
  allowed: Record<'product' | 'receipt' | 'issue' | 'adjustment', boolean>;
  onAction: (request: SheetRequest) => void;
}

/** «Caducidad sin confirmar» siempre se diseña (01 §7): con texto y color, no solo en gris. */
function Expiry({ position }: { position: Position }) {
  return position.lot.expiresOn ? (
    <span className="text-[12px] text-ink-muted">Caduca {formatDate(position.lot.expiresOn)}</span>
  ) : (
    <Badge tone="warning">Caducidad desconocida</Badge>
  );
}

function ProductHeading({ product }: { product: StockedProduct }) {
  return (
    <>
      <span className="font-semibold text-ink">{product.name}</span>
      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] font-normal text-ink-muted">
        <span className="whitespace-nowrap">{product.code}</span>
        {product.casNumber ? <span className="whitespace-nowrap">CAS {product.casNumber}</span> : null}
      </span>
    </>
  );
}

function ProductActions({ product, allowed, onAction }: Omit<InventoryViewProps, 'products' | 'byProduct'> & { product: StockedProduct }) {
  return (
    <>
      {allowed.product ? (
        <Button size="sm" variant="ghost" onClick={() => onAction({ kind: 'lot', productId: product.id })}>
          Nuevo lote
        </Button>
      ) : null}
      {allowed.receipt ? (
        <Button size="sm" variant="ghost" onClick={() => onAction({ kind: 'receipt', productId: product.id })}>
          Ingreso
        </Button>
      ) : null}
    </>
  );
}

function PositionActions({ position, allowed, onAction }: Omit<InventoryViewProps, 'products' | 'byProduct'> & { position: Position }) {
  return (
    <>
      {allowed.issue && position.balance !== '0' ? (
        <Button size="sm" variant="ghost" onClick={() => onAction({ kind: 'issue', positionId: position.id })}>
          Salida
        </Button>
      ) : null}
      {allowed.adjustment ? (
        <Button size="sm" variant="ghost" onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}>
          Ajustar
        </Button>
      ) : null}
    </>
  );
}

/** En el móvil: el reactivo con su total y, debajo, sus lotes como filas con sangría. */
function InventoryList({ products, byProduct, allowed, onAction }: InventoryViewProps) {
  return (
    <ul className="divide-y divide-line">
      {products.map((product) => {
        const rows = byProduct.get(product.id) ?? [];
        return (
          <li key={product.id} className="py-4">
            <div className="flex items-start justify-between gap-3 px-4">
              <h3 className="min-w-0">
                <ProductHeading product={product} />
              </h3>
              <Quantity value={product.balance} unit={product.baseUnit} className="text-lg font-semibold text-ink" />
            </div>
            {allowed.product || allowed.receipt ? (
              <div className="mt-2 flex gap-1 px-2">
                <ProductActions product={product} allowed={allowed} onAction={onAction} />
              </div>
            ) : null}
            {rows.length === 0 ? (
              <p className="mt-2 px-4 text-sm text-ink-subtle">Sin existencias registradas.</p>
            ) : (
              <ul className="ml-4 mt-3 divide-y divide-line border-l border-line">
                {rows.map((position) => (
                  <li key={position.id} className="py-3 pl-4 pr-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid min-w-0 gap-1 text-sm">
                        <span className="font-medium text-ink">{position.lot.code}</span>
                        <span className="text-ink">{position.location.name}</span>
                        <Expiry position={position} />
                      </div>
                      <Quantity
                        value={position.balance}
                        unit={position.unit}
                        className={`text-base font-semibold ${position.balance === '0' ? 'text-ink-subtle' : 'text-ink'}`}
                      />
                    </div>
                    {allowed.issue || allowed.adjustment ? (
                      <div className="-ml-3 mt-2 flex gap-1">
                        <PositionActions position={position} allowed={allowed} onAction={onAction} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function InventoryGrid({ products, byProduct, allowed, onAction }: InventoryViewProps) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeader>Lote</TableHeader>
          <TableHeader>Ubicación</TableHeader>
          <TableHeader numeric>Saldo</TableHeader>
          <TableHeader className="w-0">
            <span className="sr-only">Acciones</span>
          </TableHeader>
        </tr>
      </TableHead>
      {products.map((product) => {
        const rows = byProduct.get(product.id) ?? [];
        return (
          <TableBody key={product.id} className="border-t border-line first-of-type:border-t-0">
            <tr className="bg-surface">
              <th scope="rowgroup" colSpan={2} className="px-4 pb-2 pt-4 text-left font-normal">
                <ProductHeading product={product} />
              </th>
              <td className="px-4 pb-2 pt-4 text-right">
                <span className="sr-only">Total del reactivo: </span>
                <Quantity value={product.balance} unit={product.baseUnit} className="text-lg font-semibold text-ink" />
              </td>
              <td className="px-4 pb-2 pt-4 text-right">
                <div className="flex justify-end gap-1">
                  <ProductActions product={product} allowed={allowed} onAction={onAction} />
                </div>
              </td>
            </tr>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 pb-4 text-sm text-ink-subtle">
                  Sin existencias registradas.
                </td>
              </tr>
            ) : (
              rows.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="pl-8">
                    <span className="block font-medium">{position.lot.code}</span>
                    <Expiry position={position} />
                  </TableCell>
                  <TableCell>
                    {position.location.name}
                    <span className="block text-[12px] text-ink-muted">{position.location.code}</span>
                  </TableCell>
                  <TableCell numeric>
                    <Quantity
                      value={position.balance}
                      unit={position.unit}
                      className={`text-base font-semibold ${position.balance === '0' ? 'text-ink-subtle' : 'text-ink'}`}
                    />
                  </TableCell>
                  <TableCell className="w-0 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <PositionActions position={position} allowed={allowed} onAction={onAction} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        );
      })}
    </Table>
  );
}

/** El tipo no es un estado: se distingue por icono y texto, no por colores de alerta. */
const typeLabel: Record<Operation['type'], { label: string; icon: typeof Scale }> = {
  receipt: { label: 'Ingreso', icon: ArrowDownToLine },
  issue: { label: 'Salida', icon: ArrowUpFromLine },
  adjustment: { label: 'Ajuste', icon: Scale },
};

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Operation>();

/** Historial como libro: cada fila, una operación con su responsable; nada se edita. */
function MovementsTable({ operations, timeZone }: { operations: Operation[]; timeZone: string }) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('effectiveAt', {
          header: 'Fecha',
          cell: (info) => <span className="whitespace-nowrap text-ink-muted">{formatDateTime(info.getValue(), timeZone)}</span>,
        }),
        helper.accessor('type', {
          header: 'Movimiento',
          cell: (info) => {
            const type = typeLabel[info.getValue()];
            const Icon = type.icon;
            return (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
                <Icon className="size-3.5 text-ink-muted" aria-hidden />
                {type.label}
              </span>
            );
          },
        }),
        helper.display({
          id: 'reagent',
          header: 'Reactivo',
          cell: ({ row }) => (
            <>
              <span className="block min-w-48 font-medium">{row.original.product.name}</span>
              <span className="block text-[12px] text-ink-muted">
                {row.original.lot.code} · {row.original.location.code}
              </span>
            </>
          ),
        }),
        helper.accessor('quantity', {
          header: 'Cantidad',
          cell: ({ row }) => <Quantity value={row.original.quantity} unit={row.original.unit} signed className="font-semibold" />,
        }),
        helper.accessor('balanceAfter', {
          header: 'Saldo',
          cell: ({ row }) => <Quantity value={row.original.balanceAfter} unit={row.original.unit} className="text-ink-muted" />,
        }),
        helper.display({
          id: 'actor',
          header: 'Responsable',
          cell: ({ row }) => (
            <span className="whitespace-nowrap">{row.original.actor.displayName ?? 'Miembro anterior'}</span>
          ),
        }),
        helper.display({
          id: 'detail',
          header: 'Detalle',
          cell: ({ row }) => {
            const { reason, destination, reference } = row.original;
            const text = [reason, destination ? `→ ${destination}` : null, reference].filter(Boolean).join(' ');
            return <span className="text-ink-muted">{text || '—'}</span>;
          },
        }),
      ]),
    [timeZone],
  );
  const table = useTable({ features, columns, data: operations, getRowId: (row) => row.id });
  const numeric = new Set(['quantity', 'balanceAfter']);

  if (operations.length === 0) {
    return (
      <StatePanel
        icon={History}
        title="Todavía no hay movimientos"
        description="Cada ingreso, salida o ajuste quedará aquí con su responsable y no se podrá editar."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <TableHeader key={header.id} numeric={numeric.has(header.column.id)}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHeader>
            ))}
          </tr>
        ))}
      </TableHead>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id} numeric={numeric.has(cell.column.id)}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
