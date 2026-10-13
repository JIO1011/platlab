// Prototipo R-01D: solo interfaz
import { Badge, cn, formatDecimal, normalizeDecimalInput } from '@platlab/ui';
import { Building2, Calendar, ChevronUp, FlaskConical, MapPin } from 'lucide-react';
import { QrCode } from '../../../app/qr-code';
import { ControlledMark } from './controlled';
import { HazardTags } from './hazards';
import { countValid, sampleCode } from './wizard-model';

export interface PreviewData {
  name: string;
  controlled: boolean;
  hazards: string[];
  count: number | null;
  quantity: string;
  unit: string;
  placeName: string;
  placeRoute: string;
  /** Texto ya listo: fecha, «Caducidad sin confirmar» o vacío. */
  expiry: string;
  brand: string;
}

const MAX_LABELS = 3;

/** Lo que se va viendo: reactivo y frascos con el lenguaje de la tarjeta de frasco, y las etiquetas en miniatura. */
function PreviewBody({ data }: { data: PreviewData }) {
  const bottles = countValid(data.count) ? data.count : null;
  const quantity = normalizeDecimalInput(data.quantity);
  const hasQuantity = /^\d{1,15}(\.\d{1,9})?$/.test(quantity);
  if (!data.name) {
    return (
      <div className="grid place-items-center gap-2 rounded-card border border-dashed border-line-strong px-4 py-10 text-center">
        <FlaskConical className="size-7 text-ink-subtle" aria-hidden />
        <p className="max-w-[16rem] text-sm text-ink-muted">Aquí verás los frascos que vas a ingresar.</p>
      </div>
    );
  }
  const shown = bottles === null ? 0 : Math.min(bottles, MAX_LABELS);
  return (
    <div className="grid gap-4">
      <article className="grid gap-3 rounded-card bg-surface p-4 shadow-raised">
        <div className="flex flex-wrap gap-1.5">
          {data.brand ? (
            <Badge className="gap-1 text-[12px]">
              <Building2 className="size-3" aria-hidden />
              {data.brand}
            </Badge>
          ) : null}
          {data.placeName ? (
            <Badge className="gap-1 text-[12px]" title={data.placeRoute}>
              <MapPin className="size-3" aria-hidden />
              {data.placeName}
            </Badge>
          ) : null}
          {data.expiry ? (
            <Badge className="gap-1 text-[12px]">
              <Calendar className="size-3" aria-hidden />
              {data.expiry}
            </Badge>
          ) : null}
        </div>
        <div>
          <h4 className="flex items-center gap-1.5 text-base font-bold leading-tight text-ink">
            {data.name}
            {data.controlled ? <ControlledMark /> : null}
          </h4>
          {data.hazards.length > 0 ? (
            <div className="mt-2">
              <HazardTags ids={data.hazards} />
            </div>
          ) : null}
        </div>
        {hasQuantity ? (
          <p className="text-3xl font-bold leading-none tracking-tight tabular-nums text-action">
            {bottles ?? '—'} <span className="text-lg font-semibold text-ink-muted">×</span> {formatDecimal(quantity)}{' '}
            <span className="text-base font-normal text-ink-muted">{data.unit}</span>
          </p>
        ) : (
          <p className="text-xl font-bold leading-none tracking-tight text-ink-muted">
            {bottles === null ? 'Falta la cantidad' : `${bottles} ${bottles === 1 ? 'frasco' : 'frascos'}`}
          </p>
        )}
        {data.placeRoute ? <p className="text-[13px] text-ink-muted">{data.placeRoute}</p> : null}
      </article>

      {bottles !== null ? (
        <section aria-label="Etiquetas" className="grid gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Etiquetas</h4>
          <ul className="grid gap-2">
            {Array.from({ length: shown }, (_, index) => {
              const code = sampleCode(data.name, index);
              return (
                <li key={code} className="flex items-center gap-3 rounded-control border border-dashed border-line-strong bg-surface p-2">
                  <QrCode value={`https://platlab.example/q/muestra-${code}`} label={`QR de muestra del frasco ${code}`} className="size-10 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] font-medium tabular-nums text-ink">{code}</span>
                    <span className="block truncate text-[12px] text-ink-muted">{data.name}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {bottles > shown ? <p className="text-[13px] text-ink-muted">y {bottles - shown} más…</p> : null}
        </section>
      ) : null}
    </div>
  );
}

/** Columna derecha del asistente en escritorio. */
export function PreviewPanel({ data }: { data: PreviewData }) {
  return (
    <aside aria-label="Así quedará" className="hidden content-start gap-3 rounded-card bg-surface-sunken/60 self-start p-4 lg:sticky lg:top-0 lg:grid">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Así quedará</h3>
      <PreviewBody data={data} />
    </aside>
  );
}

/** Texto corto de la barra del móvil: «3 frascos · Estante C». */
function previewSummary(data: PreviewData): string {
  if (!data.name) return 'Así quedará';
  const parts = [countValid(data.count) ? `${data.count} ${data.count === 1 ? 'frasco' : 'frascos'}` : '', data.placeName].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : data.name;
}

/** Barra al pie del móvil: resume lo que se va a ingresar y, al tocarla, abre la vista previa. */
export function PreviewBar({ data, open, onToggle }: { data: PreviewData; open: boolean; onToggle: () => void }) {
  return (
    <div className="grid gap-2 lg:hidden">
      {open ? (
        <div id="vista-previa" className="max-h-[42dvh] overflow-y-auto rounded-panel bg-surface-sunken/60 p-3">
          <PreviewBody data={data} />
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="vista-previa"
        onClick={onToggle}
        className="flex min-h-[44px] items-center justify-between gap-3 rounded-control bg-surface-sunken px-4 text-left text-sm font-medium text-ink transition-colors hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
      >
        <span className="min-w-0 truncate">{previewSummary(data)}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] text-ink-muted">
          Así quedará
          <ChevronUp className={cn('size-4 transition-transform duration-200 ease-out-expo', open && 'rotate-180')} aria-hidden />
        </span>
      </button>
    </div>
  );
}
