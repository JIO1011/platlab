import { Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@platlab/ui';
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { QueryErrorState } from '../../app/states';
import { useMaintenance } from './context';
import { CompletedTab } from './completed-list';
import { DueTab } from './due-list';
import { useDue } from './queries';
import { RecordSheet } from './record-sheet';
import { SectionHeader } from './section-header';

type View = 'por-hacer' | 'completados';
const viewFrom = (value: string | null): View => (value === 'completados' ? 'completados' : 'por-hacer');

/** La hoja de registro abierta; `n` la monta de nuevo en cada apertura; `url` es el equipo con que se llegó (`?registrar=`). */
interface Recording {
  n: number;
  open: boolean;
  assetId?: string;
  planId?: string;
  url: string | null;
}

/**
 * Trabajos de Mantenimiento (ADR 0020): «Por hacer» y «Completados» como pestañas que viven en la URL
 * (`?vista=`, y `&equipo=` para los de un equipo). `?registrar=<equipo>` abre la hoja de registro con ese equipo.
 */
export function MaintenanceWorkPage() {
  const { workspaceId, me, base, canRecord } = useMaintenance();
  const [params, setParams] = useSearchParams();
  const view = viewFrom(params.get('vista'));
  const equipo = params.get('equipo');
  const registrar = params.get('registrar');
  const due = useDue(workspaceId);
  const [recording, setRecording] = useState<Recording | null>(null);

  // El enlace de un equipo (su ficha, un QR) llega con `?registrar=`: abre «Registrar mantenimiento» con ese equipo.
  if (registrar && canRecord && recording?.url !== registrar) {
    setRecording({ n: (recording?.n ?? 0) + 1, open: true, assetId: registrar, url: registrar });
  }

  const choose = (next: View) =>
    setParams(
      (previous) => {
        const search = new URLSearchParams(previous);
        search.delete('registrar');
        if (next === 'por-hacer') {
          search.delete('vista');
          search.delete('equipo');
        } else {
          search.set('vista', next);
        }
        return search;
      },
      { replace: true },
    );
  const clearAsset = () =>
    setParams(
      (previous) => {
        const search = new URLSearchParams(previous);
        search.delete('equipo');
        return search;
      },
      { replace: true },
    );
  const openRecording = (assetId: string | null, planId?: string) =>
    setRecording({
      n: (recording?.n ?? 0) + 1,
      open: true,
      url: null,
      ...(assetId ? { assetId } : {}),
      ...(planId ? { planId } : {}),
    });
  // Al cerrar se quita `?registrar=`: volver a entrar con ese enlace abre la hoja otra vez.
  const closeRecording = (open: boolean) => {
    if (open) return;
    setRecording((current) => (current ? { ...current, open: false } : current));
    if (registrar) {
      setParams(
        (previous) => {
          const search = new URLSearchParams(previous);
          search.delete('registrar');
          return search;
        },
        { replace: true },
      );
    }
  };

  const recordButton = canRecord ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => openRecording(view === 'completados' ? equipo : null)}>
      <ClipboardCheck aria-hidden />
      Registrar mantenimiento
    </Button>
  ) : undefined;

  return (
    <>
      <SectionHeader title="Trabajos" updatedAt={due.dataUpdatedAt} actions={recordButton} />
      <Tabs value={view} onValueChange={(value) => choose(viewFrom(value))} className="mt-6">
        <TabsList aria-label="Trabajos" className="flex w-full sm:inline-flex sm:w-auto">
          <TabsTrigger value="por-hacer" className="h-11 flex-1 sm:h-9 sm:flex-none">
            Por hacer
            {due.data ? <span className="ml-1.5 tabular-nums text-ink-subtle">{due.data.total}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="completados" className="h-11 flex-1 sm:h-9 sm:flex-none">
            Completados
          </TabsTrigger>
        </TabsList>
        <TabsContent value="por-hacer" className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
          {due.isPending ? (
            <div role="status" aria-busy="true" aria-label="Cargando" className="grid gap-3">
              <Skeleton className="h-11 rounded-control" />
              <Skeleton className="h-64 rounded-card" />
            </div>
          ) : due.isError ? (
            <div className="rounded-card bg-surface shadow-raised">
              <QueryErrorState error={due.error} onRetry={() => void due.refetch()} />
            </div>
          ) : (
            <DueTab
              due={due.data}
              me={me}
              workspaceId={workspaceId}
              base={base}
              onRecord={canRecord ? (assetId, planId) => openRecording(assetId, planId) : null}
            />
          )}
        </TabsContent>
        <TabsContent value="completados" className="pt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
          <CompletedTab assetId={equipo} onClearAsset={clearAsset} onRecord={canRecord ? (assetId) => openRecording(assetId) : null} />
        </TabsContent>
      </Tabs>
      {recording ? (
        <RecordSheet
          key={recording.n}
          workspaceId={workspaceId}
          me={me}
          open={recording.open}
          onOpenChange={closeRecording}
          {...(recording.assetId ? { assetId: recording.assetId } : {})}
          {...(recording.planId ? { planId: recording.planId } : {})}
        />
      ) : null}
    </>
  );
}
