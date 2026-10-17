import type { Asset } from '@platlab/contracts';
import { IconChip, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@platlab/ui';
import { MapPin, Microscope, Tag, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { assetMeta, noResponsibleLabel, placeInArea, placeLines } from './asset-text';
import { ConditionBadge } from './condition-badge';

/**
 * Miniatura del equipo, de tamaño fijo para que las filas no salten (40 px, 32 px con `size="sm"` en la
 * tabla): su foto (`alt` vacío, el nombre ya está en la fila) o, sin foto, un IconChip con el microscopio.
 */
export function AssetThumb({ asset, size = 'md' }: { asset: { photoUrl: string | null }; size?: 'md' | 'sm' }) {
  return asset.photoUrl ? (
    <img
      src={asset.photoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn('shrink-0 rounded-control border border-line bg-surface-sunken object-cover', size === 'sm' ? 'size-8' : 'size-10')}
    />
  ) : (
    <IconChip icon={Microscope} tone="neutral" size={size} />
  );
}

/** La ubicación como una dirección: la sala en el color del texto y, debajo, los niveles siguientes en gris. */
function Place({ location }: { location: Asset['location'] }) {
  const place = placeLines(location);
  return (
    <div title={place.full} className="min-w-0">
      <p className="truncate text-ink">{place.room}</p>
      {place.rest ? <p className="truncate text-[13px] text-ink-muted">{place.rest}</p> : null}
    </div>
  );
}

/**
 * Inventario en tabla (ADR 0019), dentro de una tarjeta y de columnas fijas, para que ninguna anchura desde
 * 1024 px la desborde: Código, Equipo (el nombre y, debajo, «tipo · marca · modelo»), Ubicación, Responsable y
 * Estado. La fila entera abre la ficha: el nombre es el enlace y se extiende sobre la fila. Responsable sale a
 * su columna cuando la tarjeta mide lo bastante (con el panel de filtros abierto no siempre cabe) y, si no,
 * baja bajo el nombre.
 */
export function AssetTable({ assets, base }: { assets: Asset[]; base: string }) {
  return (
    <div className="@container overflow-hidden rounded-card bg-surface shadow-raised">
      <Table className="table-fixed">
        <TableHead>
          <tr>
            <TableHeader className="w-28 px-3 pl-5">Código</TableHeader>
            <TableHeader className="px-3">Equipo</TableHeader>
            <TableHeader className="w-[22%] px-3">Ubicación</TableHeader>
            <TableHeader className="hidden w-[20%] px-3 @3xl:table-cell">Responsable</TableHeader>
            <TableHeader className="w-36 px-3 pr-4">Estado</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {assets.map((asset) => {
            const line = [asset.type.name, asset.brand, asset.model].filter(Boolean).join(' · ');
            return (
              <TableRow
                key={asset.id}
                className="relative has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-action"
              >
                <TableCell className="whitespace-nowrap px-3 pl-5 align-top font-mono text-[13px] tabular-nums text-ink-muted">
                  {asset.code}
                </TableCell>
                <TableCell className="px-3 align-top">
                  <div className="flex items-start gap-3">
                    <AssetThumb asset={asset} size="sm" />
                    <div className="min-w-0">
                      <Link
                        to={`${base}/inventario/${asset.id}`}
                        className="break-words font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {asset.name}
                      </Link>
                      <p className="break-words text-[13px] text-ink-muted">{line}</p>
                      <p className="break-words text-[13px] text-ink-muted @3xl:hidden">
                        Responsable: {asset.responsible ? asset.responsible.name : noResponsibleLabel}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-3 align-top">
                  <Place location={asset.location} />
                </TableCell>
                <TableCell className="hidden break-words px-3 align-top @3xl:table-cell">
                  {asset.responsible ? asset.responsible.name : <span className="text-ink-muted">{noResponsibleLabel}</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 pr-4 align-top">
                  <ConditionBadge condition={asset.condition} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** En pantallas estrechas, cada equipo es una tarjeta apilada que abre su ficha. */
export function AssetCards({ assets, base }: { assets: Asset[]; base: string }) {
  return (
    <ul className="grid gap-3">
      {assets.map((asset) => {
        const meta = assetMeta(asset);
        const place = placeLines(asset.location);
        return (
          <li key={asset.id}>
            <Link
              to={`${base}/inventario/${asset.id}`}
              className="group block rounded-card bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float motion-safe:hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <AssetThumb asset={asset} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[13px] tabular-nums text-ink-muted">{asset.code}</span>
                    <ConditionBadge condition={asset.condition} className="shrink-0 whitespace-nowrap" />
                  </div>
                  <p className="mt-1.5 break-words text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-action">
                    {asset.name}
                  </p>
                  {meta ? <p className="mt-0.5 break-words text-[13px] text-ink-muted">{meta}</p> : null}
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[13px] text-ink-muted">
                <p title={place.full} className="flex min-w-0 items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{place.room}</span>
                    {place.rest ? <span className="block truncate">{place.rest}</span> : null}
                  </span>
                </p>
                <p className="flex min-w-0 items-center gap-2">
                  <Tag className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{asset.type.name}</span>
                </p>
                <p className="flex min-w-0 items-center gap-2">
                  <User className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{asset.responsible?.name ?? noResponsibleLabel}</span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * La cuadrícula de cuadros del área: 2 columnas en el móvil, 3 desde `md`, 4 desde `xl`. La pila de capas
 * asoma 16 px: el hueco deja al menos 12 px libres hasta el vecino (16 px desde `md`).
 */
export const tileGrid = 'grid grid-cols-2 gap-x-7 gap-y-8 pb-4 pr-4 md:grid-cols-3 md:gap-x-8 xl:grid-cols-4';

/** El alto común de todos los cuadros del área (un tipo y un equipo miden lo mismo). */
export const tileHeight = 'h-[17rem]';

const stackLayer = 'pointer-events-none absolute inset-0 rounded-card border border-line-strong shadow-raised';

/**
 * El cuadro del área, igual para un tipo y para un equipo (E-01c): vertical, con la foto entera (`object-contain`
 * sobre blanco, `alt` vacío) o, sin foto, el microscopio sobre el fondo suave del módulo arriba y el texto abajo.
 * De alto fijo. Con `stacked` (un tipo es un grupo) asoman dos capas detrás, a 8 y 16 px. El enlace o botón de
 * `children` se extiende sobre todo el cuadro (`after:absolute after:inset-0`).
 */
export function Tile({ photoUrl, stacked = false, children }: { photoUrl: string | null; stacked?: boolean; children: ReactNode }) {
  return (
    <li className="group relative rounded-card transition-transform duration-200 ease-out-expo has-[a:focus-visible,button:focus-visible]:outline-2 has-[a:focus-visible,button:focus-visible]:outline-offset-2 has-[a:focus-visible,button:focus-visible]:outline-action motion-safe:hover:-translate-y-0.5">
      {stacked ? (
        <>
          <span aria-hidden className={cn(stackLayer, 'translate-x-4 translate-y-4 bg-line')} />
          <span aria-hidden className={cn(stackLayer, 'translate-x-2 translate-y-2 bg-surface-sunken')} />
        </>
      ) : null}
      <div
        className={cn(
          tileHeight,
          'relative flex flex-col overflow-hidden rounded-card bg-surface shadow-raised transition-shadow duration-200 ease-out-expo group-hover:shadow-float',
        )}
      >
        <div className={cn('flex h-40 shrink-0 items-center justify-center md:h-44', photoUrl ? 'bg-surface' : 'bg-action-soft/70')}>
          {photoUrl ? (
            <img src={photoUrl} alt="" loading="lazy" decoding="async" className="size-full object-contain p-3" />
          ) : (
            <Microscope className="size-12 text-action/50" strokeWidth={1.5} aria-hidden />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden p-3.5">{children}</div>
      </div>
    </li>
  );
}

/**
 * Cuadros de equipos de un área (E-01c), con la estructura del cuadro por tipo: la foto o el icono arriba y,
 * debajo, el nombre (1 línea, enlace sobre todo el cuadro), el código con la condición y el lugar dentro del
 * área (si el equipo no está en el área misma).
 */
export function AssetTiles({ assets, base, areaName }: { assets: Asset[]; base: string; areaName: string }) {
  return (
    <ul className={tileGrid}>
      {assets.map((asset) => {
        const place = placeInArea(asset.location, areaName);
        return (
          <Tile key={asset.id} photoUrl={asset.photoUrl}>
            <Link
              to={`${base}/inventario/${asset.id}`}
              title={asset.name}
              className="truncate text-[15px] font-semibold leading-tight text-ink after:absolute after:inset-0 focus-visible:outline-none"
            >
              {asset.name}
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink-muted">{asset.code}</span>
              <ConditionBadge condition={asset.condition} className="shrink-0 whitespace-nowrap" />
            </div>
            {place ? (
              <p className="flex min-w-0 items-center gap-1.5 text-[13px] leading-snug text-ink-muted">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{place}</span>
              </p>
            ) : null}
          </Tile>
        );
      })}
    </ul>
  );
}
