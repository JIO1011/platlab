import type { AssetDocument } from '@platlab/contracts';
import { Button, Skeleton, StatePanel, toast } from '@platlab/ui';
import { FileText, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatDayInZone } from '../../app/format';
import { formatFileSize } from '../../app/pdf-file';
import { QueryErrorState } from '../../app/states';
import { equipmentErrorMessage, useArchiveAssetDocument } from './commands';
import { useEquipment } from './context';
import { documentKindLabel } from './document-text';
import { personText } from './fault-text';
import { useAssetDocuments } from './queries';
import { DocumentSheet } from './sheets/document-sheet';

/**
 * Un documento: el nombre es el enlace al PDF (otra pestaña) y cubre toda la fila; debajo van tipo, fecha y quién lo
 * subió. «Quitar» (solo si `canRemove`) queda sobre el enlace y pide confirmar aquí mismo: archiva el documento y no
 * hay «Deshacer».
 */
function DocumentRow({ doc, assetId, canRemove }: { doc: AssetDocument; assetId: string; canRemove: boolean }) {
  const { workspaceId, me } = useEquipment();
  const archive = useArchiveAssetDocument(workspaceId, assetId);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Al cancelar, el foco vuelve a «Quitar» (que estuvo oculto mientras se confirmaba).
  useEffect(() => {
    if (wasConfirming.current && !confirming) removeRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const cancel = () => {
    setConfirming(false);
    setError(null);
  };

  const remove = async () => {
    setError(null);
    try {
      await archive.mutateAsync(doc.id);
      toast.success(`Se quitó «${doc.title}»`);
    } catch (failure) {
      setError(equipmentErrorMessage(failure));
    }
  };

  return (
    <li className="relative px-5 py-3.5 transition-colors hover:bg-surface-sunken/60 md:px-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-ink-muted">
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <a
            href={doc.url}
            target="_blank"
            rel="noopener"
            className="break-words text-sm font-semibold text-action hover:text-action-hover after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-action"
          >
            {doc.title}
            <span className="sr-only"> (PDF, {formatFileSize(doc.byteSize)})</span>
          </a>
          <p className="text-[13px] text-ink-muted">
            <span className="whitespace-nowrap">
              {documentKindLabel[doc.kind]} · {formatDayInZone(doc.uploadedAt, me.workspace.timeZone)}
            </span>{' '}
            <span className="whitespace-nowrap">· {personText(doc.uploadedBy)}</span>
          </p>
        </div>
        {canRemove && !confirming ? (
          <Button
            ref={removeRef}
            variant="ghost"
            size="sm"
            className="relative z-10 h-11 shrink-0 sm:h-8"
            aria-label={`Quitar «${doc.title}»`}
            onClick={() => setConfirming(true)}
          >
            Quitar
          </Button>
        ) : null}
      </div>
      {confirming ? (
        <div role="group" aria-label={`Quitar «${doc.title}»`} className="relative z-10 mt-3 grid gap-3 rounded-control bg-surface-sunken p-3 sm:ml-12">
          <p className="text-sm text-ink">¿Quitar «{doc.title}»? Deja de verse en la ficha y en la hoja de vida; no se puede recuperar desde aquí.</p>
          {error ? (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-11 border-transparent bg-danger text-white hover:bg-danger/90 sm:h-10"
              loading={archive.isPending} onClick={() => void remove()}
            >
              Quitar documento
            </Button>
            <Button variant="ghost" className="h-11 sm:h-10" disabled={archive.isPending} onClick={cancel} autoFocus>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Pestaña «Documentos» de la ficha (ADR 0019, E-01e): los PDF vigentes del equipo, del más reciente al más antiguo.
 * El Administrador agrega y quita (`canManage`), salvo con el equipo dado de baja; los demás solo los abren.
 */
export function AssetDocuments({ assetId, retired }: { assetId: string; retired: boolean }) {
  const { workspaceId, canManage } = useEquipment();
  const documents = useAssetDocuments(workspaceId, assetId);
  const [sheet, setSheet] = useState<{ n: number; open: boolean } | null>(null);
  const canEdit = canManage && !retired;
  const items = documents.data?.items ?? [];
  const showBar = canEdit || items.length > 0;

  return (
    <section aria-label="Documentos del equipo" className="rounded-card bg-surface shadow-raised">
      {showBar ? (
        <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          {items.length > 0 ? <h2 className="text-sm font-bold text-ink">Documentos ({items.length})</h2> : null}
          {canEdit ? (
            <Button aria-haspopup="dialog" className="h-11 w-full sm:ml-auto sm:h-10 sm:w-auto" onClick={() => setSheet({ n: (sheet?.n ?? 0) + 1, open: true })}>
              <Plus aria-hidden />
              Agregar documento
            </Button>
          ) : null}
        </div>
      ) : null}
      {documents.isPending ? (
        <div className="grid gap-3 p-5 md:p-6" role="status" aria-busy="true" aria-label="Cargando los documentos">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : documents.isError ? (
        <QueryErrorState error={documents.error} onRetry={() => void documents.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel icon={FileText} title="Sin documentos" description="El manual, la factura y la garantía del equipo, en PDF, quedarán aquí." />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} assetId={assetId} canRemove={canEdit} />
          ))}
        </ul>
      )}
      {sheet ? (
        <DocumentSheet
          key={sheet.n}
          workspaceId={workspaceId}
          open={sheet.open}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          assetId={assetId}
        />
      ) : null}
    </section>
  );
}
