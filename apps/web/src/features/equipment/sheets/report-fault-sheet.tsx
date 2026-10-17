import { reportFaultRequest, type ReportableAsset } from '@platlab/contracts';
import { Button, Field, Input, Skeleton, Textarea, cn, toast } from '@platlab/ui';
import { ScanLine, Search, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isApiError } from '../../../app/api';
import { FormSheet, validate, type SheetBaseProps } from '../../../app/form-sheet';
import { readLabelLink } from '../../../app/label-link';
import { PillField } from '../../../app/pills';
import { ScannerView, type ScanReading } from '../../../app/scan/scanner-view';
import { AssetThumb } from '../asset-list';
import { placeLines } from '../asset-text';
import { equipmentErrorMessage, useReportFault } from '../commands';
import { faultTypeLabel, faultTypes } from '../fault-text';
import { useReportableAsset, useReportableAssets } from '../queries';

const SEARCH_DELAY_MS = 250;
const DESCRIPTION_MAX = 2000;

/** El equipo con su miniatura, su código y su ubicación: lo que se elige y lo que queda elegido. */
function AssetLine({ asset }: { asset: ReportableAsset }) {
  const place = placeLines(asset.location);
  return (
    <span className="flex min-w-0 items-center gap-3 text-left">
      <AssetThumb asset={asset} />
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold text-ink">
          <span className="font-mono text-[13px] font-normal tabular-nums text-ink-muted">{asset.code}</span> {asset.name}
        </span>
        <span className="block break-words text-[13px] text-ink-muted">{place.full}</span>
      </span>
    </span>
  );
}

/** Aquí solo sirve la etiqueta de un equipo de este espacio; lo demás avisa por qué y sigue escaneando. */
function readAssetLabel(workspaceId: string, text: string): ScanReading<string> {
  const link = readLabelLink(text);
  if (!link) return { notice: 'Este código no es una etiqueta de PlatLab' };
  if (link.kind !== 'equipo') return { notice: 'Es la etiqueta de un frasco: apunta a la del equipo' };
  if (link.workspaceId !== workspaceId) return { notice: 'Este equipo es de otro espacio de trabajo' };
  return { value: link.id, found: 'Etiqueta leída. Buscando el equipo…' };
}

/**
 * El buscador del equipo: dos letras del código o del nombre (quien reporta no ve el inventario), o «Escanear»
 * su etiqueta con la cámara (E-01d). Elegido el equipo, queda a la vista con «Cambiar», salvo que ya viniera
 * elegido desde su ficha.
 */
function AssetPicker({
  workspaceId,
  active,
  chosen,
  locked,
  lookup,
  error,
  onChoose,
  onScanned,
  onClear,
}: {
  workspaceId: string;
  /** La hoja está abierta: sin esto, la cámara se apaga. */
  active: boolean;
  chosen: ReportableAsset | null;
  locked: boolean;
  /** El equipo de una etiqueta escaneada, mientras llega, o por qué no se puede reportar. */
  lookup: { pending: boolean; error: string | null };
  error: string | undefined;
  onChoose: (asset: ReportableAsset) => void;
  onScanned: (assetId: string) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [scanning, setScanning] = useState(false);
  // La búsqueda sale 250 ms después de la última tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text]);
  const search = useReportableAssets(workspaceId, term, chosen === null && !scanning);

  if (chosen) {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-ink">Equipo</span>
        <div className="flex items-center justify-between gap-3 rounded-control bg-surface-sunken px-3 py-2.5">
          <AssetLine asset={chosen} />
          {locked ? null : (
            <Button size="sm" className="max-sm:h-11" onClick={onClear}>
              Cambiar
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (lookup.pending) {
    return (
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-ink">Equipo</span>
        <div role="status" aria-busy="true" aria-label="Buscando el equipo de la etiqueta">
          <Skeleton className="h-14" />
        </div>
      </div>
    );
  }

  if (scanning) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink">Equipo</span>
          <Button size="sm" className="max-sm:h-11" onClick={() => setScanning(false)}>
            Buscar por nombre
          </Button>
        </div>
        <ScannerView
          active={active}
          read={(scanned) => readAssetLabel(workspaceId, scanned)}
          onFound={(assetId) => {
            setScanning(false);
            onScanned(assetId);
          }}
        />
      </div>
    );
  }

  const typed = text.trim();
  const ready = term.length >= 2 && typed === term;
  const items = search.data?.items ?? [];
  return (
    <Field
      label="Equipo"
      required
      hint="Escribe al menos 2 letras de su código o de su nombre, o escanea su etiqueta."
      error={error}
    >
      <div className="grid gap-2">
        {lookup.error ? (
          <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {lookup.error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <Input
              type="search"
              autoComplete="off"
              placeholder="Código o nombre del equipo"
              className="h-11 pl-9"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 100))}
              // Enter en el buscador no envía el reporte: el equipo se elige de la lista.
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
              }}
            />
          </div>
          {/* En pantallas angostas queda solo el icono (44 px), para que el buscador conserve su texto. */}
          <Button className="h-11 shrink-0 max-[420px]:w-11 max-[420px]:px-0" onClick={() => setScanning(true)}>
            <ScanLine aria-hidden />
            <span className="max-[420px]:sr-only">Escanear</span>
          </Button>
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
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
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
                      className="flex min-h-14 w-full items-center rounded-[10px] px-2 py-1.5 transition-colors hover:bg-action-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action"
                    >
                      <AssetLine asset={asset} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : null}
      </div>
    </Field>
  );
}

/**
 * «Reportar incidente» (ADR 0019): el equipo (buscado por código o nombre, escaneado de su etiqueta o ya
 * elegido desde su ficha), el tipo, qué pasa y si el equipo se puede seguir usando; si no, pasa a Fuera de
 * servicio. Elegir si se puede usar es obligatorio: no hay respuesta por omisión sobre algo que decide la
 * disponibilidad.
 */
export function ReportFaultSheet({
  workspaceId,
  open,
  onOpenChange,
  asset,
  scannedAssetId,
}: SheetBaseProps & { asset?: ReportableAsset | undefined; scannedAssetId?: string | null }) {
  const command = useReportFault(workspaceId);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReportableAsset | null>(asset ?? null);
  // El equipo de una etiqueta (escaneada aquí o con la que se llegó) se pide por su id; llegado, queda elegido.
  const [scannedId, setScannedId] = useState<string | null>(scannedAssetId ?? null);
  const scanned = useReportableAsset(workspaceId, picked ? null : scannedId);
  const chosen = picked ?? scanned.data ?? null;
  const lookupError = scanned.isError
    ? isApiError(scanned.error, 'NOT_FOUND')
      ? 'Este equipo no se puede reportar: está dado de baja o no es de este espacio.'
      : 'No se pudo buscar el equipo de la etiqueta. Vuelve a escanearla.'
    : null;
  const form = useForm({ defaultValues: { assetId: asset?.id ?? '', faultType: '', description: '', usable: '' } });
  const errors = form.formState.errors;
  const usable = form.watch('usable');

  const submit = form.handleSubmit(async (values) => {
    setGeneralError(null);
    let invalid = false;
    if (!chosen) {
      form.setError('assetId', { message: 'Elige el equipo con el incidente.' });
      invalid = true;
    }
    if (!values.faultType) {
      form.setError('faultType', { message: 'Elige el tipo de falla.' });
      invalid = true;
    }
    if (!values.description.trim()) {
      form.setError('description', { message: 'Describe qué le pasa al equipo.' });
      invalid = true;
    }
    if (!values.usable) {
      form.setError('usable', { message: 'Indica si el equipo se puede seguir usando.' });
      invalid = true;
    }
    if (invalid || !chosen) return;
    const payload = validate(
      reportFaultRequest,
      { assetId: chosen.id, faultType: values.faultType, description: values.description.trim(), usable: values.usable === 'yes' },
      form,
    );
    if (!payload) return;
    try {
      await command.mutateAsync(payload);
      toast.success('Incidente reportado', {
        description: payload.usable ? `${chosen.name} sigue disponible.` : `${chosen.name} pasó a Fuera de servicio.`,
      });
      onOpenChange(false);
    } catch (error) {
      setGeneralError(equipmentErrorMessage(error));
    }
  });

  return (
    <FormSheet
      icon={TriangleAlert}
      title="Reportar incidente"
      description="Quien atiende los equipos lo verá enseguida. Puedes seguir su estado en tus incidentes."
      open={open}
      onOpenChange={onOpenChange}
      submitLabel="Reportar incidente"
      pending={command.isPending}
      generalError={generalError}
      onSubmit={() => void submit()}
    >
      <AssetPicker
        workspaceId={workspaceId}
        active={open}
        chosen={chosen}
        locked={asset !== undefined}
        lookup={{ pending: scannedId !== null && !picked && scanned.isPending, error: lookupError }}
        error={errors.assetId?.message}
        onChoose={(next) => {
          setPicked(next);
          form.setValue('assetId', next.id);
          form.clearErrors('assetId');
        }}
        onScanned={(assetId) => {
          setScannedId(assetId);
          form.clearErrors('assetId');
        }}
        onClear={() => {
          setPicked(null);
          setScannedId(null);
          form.setValue('assetId', '');
        }}
      />
      <Controller
        control={form.control}
        name="faultType"
        render={({ field }) => (
          <PillField
            label="Tipo de falla"
            required
            value={field.value}
            options={faultTypes.map((type) => ({ value: type, label: faultTypeLabel[type] }))}
            onChange={(value) => {
              field.onChange(value);
              form.clearErrors('faultType');
            }}
            error={errors.faultType?.message}
          />
        )}
      />
      <Field
        label="Qué le pasa"
        required
        hint={`Qué viste, cuándo empezó y qué estabas haciendo. Hasta ${DESCRIPTION_MAX} caracteres.`}
        error={errors.description?.message}
      >
        <Textarea rows={4} maxLength={DESCRIPTION_MAX} {...form.register('description')} />
      </Field>
      <Controller
        control={form.control}
        name="usable"
        render={({ field }) => (
          <PillField
            label="¿Se puede seguir usando?"
            required
            size="sm"
            value={field.value}
            options={[
              { value: 'yes', label: 'Sí' },
              { value: 'no', label: 'No' },
            ]}
            onChange={(value) => {
              field.onChange(value);
              form.clearErrors('usable');
            }}
            hint={usable === 'no' ? 'El equipo pasará a Fuera de servicio.' : undefined}
            error={errors.usable?.message}
          />
        )}
      />
    </FormSheet>
  );
}
