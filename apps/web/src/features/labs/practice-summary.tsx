import { quantityText } from './practice-close';
import type { RequestView } from './request-draft';

/**
 * Lo que dejó una práctica cerrada (L-01e): por reactivo, lo apartado, lo utilizado y lo devuelto, y las observaciones del
 * cierre. Es el registro de lo que salió del inventario: no se edita.
 */
export function PracticeSummary({ request, block }: { request: RequestView; block: RequestView['blocks'][number] }) {
  const rows = block.usage.flatMap((entry) => {
    const line = request.lines[entry.line - 1];
    return line?.kind === 'reagent' ? [{ entry, name: line.name, unit: line.unit }] : [];
  });
  if (rows.length === 0 && !block.closingNotes) return null;
  return (
    <div className="grid gap-2.5 rounded-control bg-surface-sunken p-3.5 text-sm">
      {rows.length > 0 ? (
        <ul className="grid gap-2">
          {rows.map(({ entry, name, unit }) => (
            <li key={entry.line} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
              <span className="min-w-0 break-words font-semibold text-ink">{name}</span>
              <span className="flex flex-wrap gap-x-3 tabular-nums text-ink-muted">
                <span>Apartado {quantityText(entry.held, unit)}</span>
                <span>Utilizado {quantityText(entry.used, unit)}</span>
                <span>Devuelto {quantityText(entry.returned, unit)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {block.closingNotes ? (
        <p className="whitespace-pre-wrap break-words text-ink">
          <span className="font-semibold">Observaciones: </span>
          {block.closingNotes}
        </p>
      ) : null}
    </div>
  );
}
