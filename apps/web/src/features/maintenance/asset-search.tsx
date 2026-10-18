import type { MaintenanceAsset } from '@platlab/contracts';
import { Button, Input, Skeleton, cn } from '@platlab/ui';
import { Search } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useMaintenanceAssets } from './queries';

const SEARCH_DELAY_MS = 250;

/** El equipo en una línea: su código, su nombre y su área; lo que se elige y lo que queda elegido. */
function AssetLine({ asset }: { asset: { code: string; name: string; area?: string | null | undefined } }) {
  return (
    <span className="grid min-w-0 text-left">
      <span className="break-words text-sm font-semibold text-ink">
        <span className="font-mono text-[13px] font-normal tabular-nums text-ink-muted">{asset.code}</span> {asset.name}
      </span>
      {asset.area ? <span className="break-words text-[13px] text-ink-muted">{asset.area}</span> : null}
    </span>
  );
}

/** El equipo elegido, a la vista, con «Cambiar» si se puede. */
export function ChosenAsset({
  asset,
  onClear,
  extra,
}: {
  asset: { code: string; name: string; area?: string | null | undefined };
  onClear?: (() => void) | undefined;
  extra?: ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-control bg-surface-sunken px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <AssetLine asset={asset} />
        {onClear ? (
          <Button size="sm" className="max-sm:h-11" onClick={onClear}>
            Cambiar
          </Button>
        ) : null}
      </div>
      {extra}
    </div>
  );
}

/**
 * Busca un equipo por el código o el nombre (2 letras o más, 250 ms después de la última tecla) y lo elige de la
 * lista. `action` es lo que va junto al buscador (el botón «Escanear» de la hoja de registro).
 */
export function AssetSearch({
  workspaceId,
  onChoose,
  excludeIds = [],
  action,
  label = 'Equipo',
  error,
}: {
  workspaceId: string;
  onChoose: (asset: MaintenanceAsset) => void;
  excludeIds?: string[];
  action?: ReactNode;
  label?: string;
  error?: string | undefined;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text]);
  const search = useMaintenanceAssets(workspaceId, term.length >= 2 ? { q: term } : null);
  const typed = text.trim();
  const ready = term.length >= 2 && typed === term;
  const items = (search.data?.items ?? []).filter((asset) => !excludeIds.includes(asset.id));
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        <span aria-hidden className="ml-0.5">
          *
        </span>
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input
            id={id}
            type="search"
            autoComplete="off"
            placeholder="Código o nombre del equipo"
            className="h-11 pl-9"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint`}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 100))}
            // Enter en el buscador no envía el formulario: el equipo se elige de la lista.
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
        </div>
        {action}
      </div>
      {typed.length >= 2 ? (
        search.isError ? (
          <div role="alert" className="grid justify-items-start gap-2 rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
            <p>No se pudo buscar el equipo. Vuelve a intentarlo.</p>
            <Button size="sm" onClick={() => void search.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : search.isPending || !ready ? (
          <div role="status" aria-busy="true" aria-label="Buscando equipos" className="grid gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : items.length === 0 ? (
          <p role="status" className="rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
            Ningún equipo coincide con «{term}». Revisa el código o prueba con otra parte del nombre.
          </p>
        ) : (
          <>
            <p role="status" className="sr-only">
              {items.length === 1 ? '1 equipo encontrado' : `${items.length} equipos encontrados`}
            </p>
            <ul className={cn('grid max-h-64 gap-1 overflow-y-auto rounded-control border border-line bg-surface p-1', search.isPlaceholderData && 'opacity-60')}>
              {items.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onChoose(asset)}
                    className="flex min-h-12 w-full items-center rounded-[10px] px-2 py-1.5 transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action"
                  >
                    <AssetLine asset={asset} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
          Escribe al menos 2 letras de su código o de su nombre.
        </p>
      )}
    </div>
  );
}
