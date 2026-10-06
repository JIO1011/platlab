import { containerResponse, type Position, type StockedProduct } from '@platlab/contracts';
import { Button, Skeleton, cn } from '@platlab/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { api } from '../../app/api';
import { formatDate } from '../../app/format';
import { frascoCode, readFrascoCode } from '../../app/frasco-link';
import { QrCode } from '../../app/qr-code';
import { usePositions, useProduct } from '../../app/queries';
import { NotFound, PageLoading, QueryErrorState } from '../../app/states';
import { useReagents } from './context';

/** Enlace del QR de un frasco: corto (`/q/…`), para que el QR se lea bien impreso (ADR 0012, entrega 4). */
function containerUrl(workspaceId: string, containerId: string): string {
  return `${window.location.origin}/q/${frascoCode(workspaceId, containerId)}`;
}

/**
 * Destino del QR: resuelve el reactivo del frasco en su espacio (con la sesión y la membresía de
 * quien lo abre) y lleva a su ficha con ese frasco resaltado.
 */
export function FrascoLinkPage() {
  const { code = '' } = useParams();
  const target = readFrascoCode(code);
  const container = useQuery({
    queryKey: ['frasco-link', code],
    queryFn: () =>
      api(`/workspaces/${target?.workspaceId ?? ''}/reagents/containers/${target?.containerId ?? ''}`, { schema: containerResponse }),
    enabled: target !== null,
    retry: false,
  });
  if (!target) return <NotFound />;
  if (container.isPending) return <PageLoading />;
  if (container.isError) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <QueryErrorState error={container.error} onRetry={() => void container.refetch()} />
      </main>
    );
  }
  return (
    <Navigate
      replace
      to={`/e/${target.workspaceId}/reactivos/inventario/${container.data.productId}/frascos/${target.containerId}`}
    />
  );
}

/**
 * Etiqueta de un frasco, de 63,5 × 33,9 mm (la hoja A4 adhesiva de 3 × 8): el QR de 22 mm a la
 * izquierda y, a la derecha, primero lo que no puede faltar (código, lote y caducidad) y después el
 * reactivo en una línea y el CAS. Negro sobre blanco, para cualquier impresora.
 */
function ContainerLabel({ position, product, url }: { position: Position; product: StockedProduct; url: string }) {
  const code = position.container?.code ?? position.lot.code;
  return (
    <div className="flex h-[33.9mm] w-[63.5mm] items-center gap-[3mm] overflow-hidden rounded-[2mm] border border-dashed border-line-strong bg-white p-[3mm] text-black print:border-black/50">
      <QrCode value={url} label={`Código QR del frasco ${code}`} className="size-[22mm] shrink-0" />
      <div className="min-w-0 flex-1 leading-tight">
        {/* El código es la identidad del frasco: nunca se corta; uno muy largo pasa de línea. */}
        <p className="break-all font-mono text-[9pt] font-bold leading-tight tabular-nums">{code}</p>
        <p className="mt-[0.5mm] text-[7.5pt]">Lote {position.lot.supplierLot ?? position.lot.code}</p>
        <p className="text-[7.5pt] font-semibold">
          {position.lot.expiresOn ? `Caduca ${formatDate(position.lot.expiresOn)}` : 'Caducidad sin confirmar'}
        </p>
        <p className="mt-[1mm] line-clamp-1 text-[8.5pt] font-semibold">{product.name}</p>
        {product.casNumber ? <p className="text-[7.5pt]">CAS {product.casNumber}</p> : null}
      </div>
    </div>
  );
}

/**
 * Etiquetas de un reactivo (ADR 0012, entrega 4): una por frasco con saldo, todas elegidas salvo que
 * se llegue con `?frascos=` (por ejemplo, tras un ingreso). En pantalla se elige cuáles; al imprimir
 * solo salen las elegidas, sin el resto de la app.
 */
export function ReagentsLabelsPage() {
  const { productId = '' } = useParams();
  const { workspaceId, base } = useReagents();
  const [params] = useSearchParams();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = positions;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const containers = useMemo(
    () => (positions.data?.pages.flatMap((page) => page.items) ?? []).filter((p) => p.container && p.balance !== '0'),
    [positions.data],
  );
  const preselected = params.get('frascos')?.split(',') ?? null;
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const selected =
    chosen ??
    new Set(containers.filter((p) => !preselected || preselected.includes(p.container?.id ?? '')).map((p) => p.id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
  };

  if (product.isError) return <QueryErrorState error={product.error} onRetry={() => void product.refetch()} />;
  if (positions.isError) return <QueryErrorState error={positions.error} onRetry={() => void positions.refetch()} />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-ink">Etiquetas</h2>
        <Link
          to={`${base}/inventario/${productId}`}
          className="inline-flex items-center gap-1 rounded-control text-sm font-medium text-action hover:text-action-hover"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a la ficha
        </Link>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {selected.size === 1 ? '1 etiqueta elegida' : `${selected.size} etiquetas elegidas`} de {containers.length}
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setChosen(new Set(containers.map((p) => p.id)))}>
            Elegir todas
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setChosen(new Set())}>
            Ninguna
          </Button>
          <Button variant="primary" disabled={selected.size === 0} onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        </div>
      </div>
      <p className="text-sm text-ink-muted">
        Para hojas A4 adhesivas de 3 × 8 (63,5 × 33,9 mm). El QR abre el frasco en PlatLab con la cámara del móvil.
      </p>
      {product.isPending || positions.isPending || hasNextPage ? (
        <Skeleton className="h-[33.9mm] w-[63.5mm] rounded-card" />
      ) : containers.length === 0 ? (
        <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
          Este reactivo no tiene frascos con saldo.
        </p>
      ) : (
        // En papel, la retícula de la hoja adhesiva: 3 columnas de 63,5 mm con 2,5 mm entre ellas y filas
        // de 33,9 mm sin hueco (los márgenes los fija `@page` en styles.css).
        <ul
          className="print-area grid grid-cols-[repeat(auto-fill,63.5mm)] gap-[4mm] print:grid-cols-[repeat(3,63.5mm)] print:gap-x-[2.5mm] print:gap-y-0"
          aria-label="Etiquetas"
        >
          {containers.map((position) => {
            const isSelected = selected.has(position.id);
            const code = position.container?.code ?? position.lot.code;
            return (
              <li key={position.id} className={cn('grid gap-1.5 break-inside-avoid print:gap-0', !isSelected && 'print:hidden')}>
                <label className="grid grid-cols-[auto_1fr] items-center gap-x-2 text-sm text-ink print:hidden">
                  <input type="checkbox" className="size-4 accent-[var(--color-action)]" checked={isSelected} onChange={() => toggle(position.id)} />
                  <span className="whitespace-nowrap tabular-nums">{code}</span>
                  {/* Línea reservada en todas: elegir o no una etiqueta no desalinea la fila. */}
                  <span className="col-start-2 min-h-5 text-[13px] text-ink-muted">{isSelected ? '' : 'No se imprime'}</span>
                </label>
                {/* La elegida lleva un anillo en el acento (solo en pantalla); el texto dice si se imprime. */}
                <div className={cn('w-fit rounded-[2mm] print:ring-0', isSelected && 'ring-2 ring-action ring-offset-2')}>
                  <ContainerLabel position={position} product={product.data} url={containerUrl(workspaceId, position.container?.id ?? '')} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
