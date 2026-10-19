import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useMaintenance } from './context';
import { RecordSheet } from './record-sheet';

/** La hoja de registro abierta; `n` la monta de nuevo en cada apertura; `url` es el equipo con que se llegó (`?registrar=`). */
interface Recording {
  n: number;
  open: boolean;
  assetId?: string;
  planId?: string;
  scan: boolean;
  url: string | null;
}

export interface RecordOptions {
  assetId?: string;
  planId?: string;
  /** Abre con la cámara, para leer la etiqueta del equipo. */
  scan?: boolean;
}

/**
 * La hoja «Registrar mantenimiento» de una portada (Resumen y Por hacer): `open` la abre, con el equipo y el plan o con
 * la cámara, y `sheet` es lo que la página dibuja. Con `fromUrl`, `?registrar=<equipo>` también la abre con ese
 * equipo y la quita de la dirección al cerrarla, de modo que volver a entrar con ese enlace la abre otra vez.
 */
export function useRecordLauncher({ fromUrl }: { fromUrl: boolean }): { open: (options?: RecordOptions) => void; sheet: ReactNode } {
  const { workspaceId, me, canRecord } = useMaintenance();
  const [params, setParams] = useSearchParams();
  const registrar = fromUrl ? params.get('registrar') : null;
  const [recording, setRecording] = useState<Recording | null>(null);

  if (registrar && canRecord && recording?.url !== registrar) {
    setRecording({ n: (recording?.n ?? 0) + 1, open: true, assetId: registrar, scan: false, url: registrar });
  }

  const open = (options: RecordOptions = {}) =>
    setRecording({
      n: (recording?.n ?? 0) + 1,
      open: true,
      scan: options.scan ?? false,
      url: null,
      ...(options.assetId ? { assetId: options.assetId } : {}),
      ...(options.planId ? { planId: options.planId } : {}),
    });

  const onOpenChange = (next: boolean) => {
    if (next) return;
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

  const sheet = recording ? (
    <RecordSheet
      key={recording.n}
      workspaceId={workspaceId}
      me={me}
      open={recording.open}
      onOpenChange={onOpenChange}
      scan={recording.scan}
      {...(recording.assetId ? { assetId: recording.assetId } : {})}
      {...(recording.planId ? { planId: recording.planId } : {})}
    />
  ) : null;

  return { open, sheet };
}
