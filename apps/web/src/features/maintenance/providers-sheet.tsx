import type { Provider } from '@platlab/contracts';
import { Button, Sheet, Skeleton, StatePanel } from '@platlab/ui';
import { Building2, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { QueryErrorState } from '../../app/states';
import { maintenanceErrorMessage, useArchiveProvider } from './commands';
import { ConfirmArchive } from '../../app/confirm-archive';
import { ProviderSheet } from './provider-sheet';
import { useProviders } from './queries';

/** Un proveedor: nombre y contacto; el Administrador edita o archiva (sigue en el historial de los registros). */
function ProviderRow({ provider, workspaceId, canManage, onEdit }: { provider: Provider; workspaceId: string; canManage: boolean; onEdit: () => void }) {
  const archive = useArchiveProvider(workspaceId, provider.id);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archiveRef = useRef<HTMLButtonElement>(null);
  return (
    <li className="grid gap-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-48">
          <p className="break-words font-semibold text-ink">{provider.name}</p>
          <p className="break-words text-[13px] text-ink-muted">{provider.contact ?? 'Sin contacto'}</p>
        </div>
        {canManage && !confirming ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="max-sm:h-11" aria-label={`Editar a ${provider.name}`} onClick={onEdit}>
              Editar
            </Button>
            <Button ref={archiveRef} variant="ghost" size="sm" className="max-sm:h-11" aria-label={`Archivar a ${provider.name}`} onClick={() => setConfirming(true)}>
              Archivar
            </Button>
          </div>
        ) : null}
      </div>
      {confirming ? (
        <ConfirmArchive
          label={`Archivar a ${provider.name}`}
          text={`¿Archivar a «${provider.name}»? Deja de ofrecerse al registrar un mantenimiento; los registros que ya lo tienen lo conservan.`}
          action="Archivar proveedor"
          pending={archive.isPending}
          error={error}
          onCancel={() => {
            setConfirming(false);
            setError(null);
            requestAnimationFrame(() => archiveRef.current?.focus());
          }}
          onConfirm={() => {
            setError(null);
            archive.mutate(undefined, { onError: (failure) => setError(maintenanceErrorMessage(failure)) });
          }}
        />
      ) : null}
    </li>
  );
}

/**
 * Proveedores, desde el menú de Planes (ADR 0020): la lista de empresas que hacen mantenimiento fuera del laboratorio.
 * El Administrador crea, edita y archiva; el Operador solo ve. También se crean desde la hoja de registro.
 */
export function ProvidersSheet({
  workspaceId,
  open,
  onOpenChange,
  canManage,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}) {
  const providers = useProviders(workspaceId);
  // `n` monta la hoja de nuevo en cada apertura; va aparte de esta, fuera de su cuerpo.
  const [form, setForm] = useState<{ n: number; open: boolean; provider?: Provider } | null>(null);
  const openForm = (provider?: Provider) => setForm({ n: (form?.n ?? 0) + 1, open: true, ...(provider ? { provider } : {}) });
  const items = providers.data?.items ?? [];

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Proveedores"
        description="Las empresas que hacen mantenimiento fuera del laboratorio. Se eligen al registrar un trabajo."
        icon={Building2}
        focusFirst
      >
        {providers.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-32 rounded-card" />
          </div>
        ) : providers.isError ? (
          <QueryErrorState error={providers.error} onRetry={() => void providers.refetch()} />
        ) : (
          <div className="grid gap-3">
            {canManage ? (
              <Button className="h-11 justify-self-start sm:h-10" aria-haspopup="dialog" onClick={() => openForm()}>
                <Plus aria-hidden />
                Nuevo proveedor
              </Button>
            ) : null}
            {items.length === 0 ? (
              <StatePanel
                icon={Building2}
                title="Aún no hay proveedores"
                description={canManage ? 'Agrega a quien hace mantenimientos fuera del laboratorio para elegirlo al registrar.' : 'Quien administra el espacio agrega los proveedores. Los trabajos internos no necesitan uno.'}
              />
            ) : (
              <ul className="divide-y divide-line">
                {items.map((provider) => (
                  <ProviderRow key={provider.id} provider={provider} workspaceId={workspaceId} canManage={canManage} onEdit={() => openForm(provider)} />
                ))}
              </ul>
            )}
          </div>
        )}
      </Sheet>
      {form ? (
        <ProviderSheet
          key={form.n}
          workspaceId={workspaceId}
          open={form.open}
          onOpenChange={(next) => setForm((current) => (current ? { ...current, open: next } : current))}
          provider={form.provider}
        />
      ) : null}
    </>
  );
}
