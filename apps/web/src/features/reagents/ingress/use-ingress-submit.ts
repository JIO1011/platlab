import { receiptRequest, receiptResponse } from '@platlab/contracts';
import { normalizeDecimalInput, toast } from '@platlab/ui';
import { useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import { isApiError } from '../../../app/api';
import { commandErrorMessage, useCommand, useUploadSafetySheet } from '../commands';
import { warnSheetNotUploaded } from '../sds';
import { catalogFields, levelOneOf, sdsFileOf, type Place } from './model';
import { rememberRecents } from './remembered';
import type { IngressReview } from './review';
import type { IngressEntry } from './use-ingress-entry';
import type { IngressLookup } from './use-ingress-lookup';

interface SubmitInput {
  workspaceId: string;
  /** Ruta base del módulo: de ahí cuelga la impresión de etiquetas. */
  base: string;
  entry: IngressEntry;
  lookup: IngressLookup;
  review: IngressReview;
  places: readonly Place[];
  /** El cuerpo de la hoja, donde se busca el primer campo inválido. */
  bodyRef: RefObject<HTMLDivElement | null>;
  /** El número de frascos vive en el pie, fuera del cuerpo: si es el que falla, el foco va allí. */
  countRef: RefObject<HTMLInputElement | null>;
  onDone: () => void;
}

/** El cuerpo de la recepción: el reactivo elegido o los datos del nuevo, y lo escrito de los frascos. */
function receiptBody({ entry, lookup, review }: Pick<SubmitInput, 'entry' | 'lookup' | 'review'>) {
  const { existing, draft, form, unit, density } = entry;
  return {
    ...(existing ? { productId: existing.id } : { newProduct: catalogFields(draft) }),
    brand: form.brand.trim() || null,
    expiresOn: !form.noExpiry && form.expiresOn ? form.expiresOn : null,
    quantity: normalizeDecimalInput(form.quantity),
    unit,
    codes: lookup.codes,
    area: form.area.trim() || null,
    locationId: form.placeId,
    // Uno nuevo pesa con la densidad de su ficha; uno existente, con la escrita para estos frascos.
    weight: review.weight.tare
      ? { grossWeight: normalizeDecimalInput(form.grossWeight), density: existing && review.volume ? normalizeDecimalInput(density) : null }
      : null,
  };
}

function announceReceipt(result: z.infer<typeof receiptResponse>, printLabels: () => void) {
  const received = result.containers;
  toast.success(received.length === 1 ? 'Frasco ingresado' : `${received.length} frascos ingresados`, {
    description: `${result.product.name} · ${received.map((container) => container.code).join(', ')}`,
    // Las etiquetas con QR de los frascos recién ingresados, a un clic (ADR 0012, entrega 4).
    action: { label: 'Imprimir etiquetas', onClick: printLabels },
  });
}

/**
 * Confirma el ingreso: revisa lo escrito (y, si algo falla, lleva el foco al primer campo inválido), envía la
 * recepción, avisa y sube la ficha de seguridad en PDF de un reactivo nuevo. Las respuestas del servidor
 * (nombre o código ocupado) vuelven al campo; el resto, al pie. La ventana no anticipa existencias.
 */
export function useIngressSubmit({ workspaceId, base, entry, lookup, review, places, bodyRef, countRef, onDone }: SubmitInput) {
  const navigate = useNavigate();
  const receipt = useCommand(workspaceId, '/receipts', receiptResponse);
  const uploadSheet = useUploadSafetySheet(workspaceId);
  const [attempted, setAttempted] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const rejectEntry = () => {
    setAttempted(true);
    requestAnimationFrame(() => (bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? (review.issues.count ? countRef.current : null))?.focus());
  };

  const failed = (error: unknown) => {
    if (isApiError(error, 'NAME_TAKEN')) entry.setServerErrors({ name: error.message });
    else if (isApiError(error, 'CODE_TAKEN')) {
      entry.setServerErrors({ code: commandErrorMessage(error) });
      if (entry.form.code === null) void lookup.suggestion.refetch();
    } else setGeneralError(commandErrorMessage(error));
  };

  const confirm = async () => {
    setGeneralError(null);
    if (review.missingFields.length > 0 || review.toReview > 0) {
      rejectEntry();
      return;
    }
    const parsed = receiptRequest.safeParse(receiptBody({ entry, lookup, review }));
    if (!parsed.success) {
      setGeneralError(parsed.error.issues[0]?.message ?? 'Revisa los datos del ingreso.');
      return;
    }
    try {
      const result = await receipt.mutateAsync(parsed.data);
      rememberRecents(workspaceId, { productId: result.product.id, locationId: levelOneOf(places, entry.form.placeId) });
      announceReceipt(result, () =>
        navigate(`${base}/inventario/${result.product.id}/etiquetas?frascos=${result.containers.map((container) => container.containerId).join(',')}`),
      );
      // El ingreso ya quedó: si la ficha no sube, se avisa y se sube desde la ficha del reactivo.
      const sheet = entry.existing ? null : sdsFileOf(entry.draft);
      if (sheet) {
        await uploadSheet.mutateAsync({ productId: result.product.id, file: sheet }).catch(warnSheetNotUploaded);
      }
      onDone();
    } catch (error) {
      failed(error);
    }
  };

  return { confirm, attempted, generalError, pending: receipt.isPending || uploadSheet.isPending };
}
