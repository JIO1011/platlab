import { Button, cn } from '@platlab/ui';
import { Check, CameraOff, LockKeyhole, TriangleAlert, VideoOff, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLabelScanner, type ScannerPhase } from './use-label-scanner';

/** Lo que se ve cuando no hay imagen: el motivo y, si tiene arreglo, cómo intentarlo de nuevo. */
const problems: Record<Exclude<ScannerPhase, 'starting' | 'scanning'>, { icon: LucideIcon; title: string; text: string; retry: boolean }> = {
  denied: { icon: CameraOff, title: 'Cámara bloqueada', text: 'Activa la cámara en los ajustes del navegador y vuelve a intentarlo.', retry: true },
  'no-camera': { icon: VideoOff, title: 'No hay cámara', text: 'Este dispositivo no tiene una cámara disponible para leer el código.', retry: false },
  insecure: { icon: LockKeyhole, title: 'Conexión no segura', text: 'El navegador solo da acceso a la cámara en páginas con HTTPS.', retry: false },
  failed: { icon: TriangleAlert, title: 'No se pudo abrir la cámara', text: 'Cierra otras apps que la estén usando y vuelve a intentarlo.', retry: true },
};

/** Pausa corta entre leer la etiqueta y seguir: lo justo para ver (y oír) que se leyó. */
const FOUND_DELAY_MS = 350;
const NOTICE_MS = 3500;

/** Qué hacer con un QR leído: aceptarlo, con el texto que lo confirma, o decir por qué no sirve aquí. */
export type ScanReading<T> = { value: T; found: string } | { notice: string };

/**
 * La cámara trasera con un marco guía (14-10-2026). Quien la usa decide qué etiqueta sirve (`read`): al
 * aceptar una, se apaga la cámara, vibra y, tras una pausa corta, entrega lo leído; un QR que no sirve
 * avisa por qué y sigue escaneando.
 */
export function ScannerView<T>({
  active,
  read,
  onFound,
}: {
  active: boolean;
  read: (text: string) => ScanReading<T>;
  onFound: (value: T) => void;
}) {
  const [found, setFound] = useState<string | null>(null);
  // Cada aviso lleva su número: reinicia el temporizador y el latido del marco.
  const [rejection, setRejection] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const lastRejected = useRef({ text: '', at: 0 });
  const foundTimer = useRef<number | undefined>(undefined);

  const { videoRef, phase, retry } = useLabelScanner({
    active,
    onText: (text) => {
      const reading = read(text);
      const now = Date.now();
      if ('notice' in reading) {
        // El mismo código a la vista no se vuelve a anunciar a cada cuadro.
        if (text !== lastRejected.current.text || now - lastRejected.current.at > NOTICE_MS) {
          setRejection((value) => value + 1);
          setNotice(reading.notice);
        }
        lastRejected.current = { text, at: now };
        return false;
      }
      if (typeof navigator.vibrate === 'function') navigator.vibrate(40);
      setNotice(null);
      setFound(reading.found);
      foundTimer.current = window.setTimeout(() => onFound(reading.value), FOUND_DELAY_MS);
      return true;
    },
  });

  useEffect(() => {
    if (notice === null) return undefined;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, rejection]);
  useEffect(() => () => window.clearTimeout(foundTimer.current), []);

  const problem = phase === 'starting' || phase === 'scanning' ? null : problems[phase];

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-panel bg-ink sm:aspect-[4/3]">
        {/* El video no lleva nombre: el estado se anuncia en el texto de abajo. */}
        <video ref={videoRef} muted playsInline aria-hidden className="absolute inset-0 size-full object-cover" />
        {phase === 'scanning' || found !== null ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              key={rejection}
              className={cn(
                'absolute inset-0 m-auto aspect-square h-[62%] rounded-2xl shadow-[0_0_0_100vmax_rgb(15_23_42/0.5)]',
                rejection === 0 ? 'motion-safe:animate-frame-settle' : 'motion-safe:animate-frame-pulse',
              )}
            >
              {(['left-0 top-0 rounded-tl-2xl border-l-[3px] border-t-[3px]', 'right-0 top-0 rounded-tr-2xl border-r-[3px] border-t-[3px]', 'bottom-0 left-0 rounded-bl-2xl border-b-[3px] border-l-[3px]', 'bottom-0 right-0 rounded-br-2xl border-b-[3px] border-r-[3px]'] as const).map((corner) => (
                <span key={corner} className={cn('absolute size-9 border-white', corner)} />
              ))}
            </div>
          </div>
        ) : null}
        {problem ? (
          <div role="alert" className="absolute inset-0 grid place-content-center justify-items-center gap-3 bg-surface-sunken p-6 text-center">
            <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
              <problem.icon className="size-6" />
            </span>
            <div className="grid gap-1">
              <p className="text-base font-semibold text-ink">{problem.title}</p>
              <p className="max-w-[28ch] text-sm text-ink-muted">{problem.text}</p>
            </div>
            {problem.retry ? <Button onClick={retry}>Reintentar</Button> : null}
          </div>
        ) : null}
      </div>

      {problem ? null : (
      <p
        role="status"
        className={cn(
          'flex min-h-10 items-center justify-center gap-2 rounded-control px-3 text-center text-sm',
          found !== null ? 'bg-success-soft font-medium text-success' : notice !== null ? 'bg-danger-soft font-medium text-danger' : 'text-ink-muted',
        )}
      >
        {found !== null ? (
          <>
            <Check className="size-4 shrink-0" aria-hidden />
            {found}
          </>
        ) : notice !== null ? (
          <>
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {notice}
          </>
        ) : phase === 'starting' ? (
          'Abriendo la cámara…'
        ) : phase === 'scanning' ? (
          'Centra el código QR dentro del marco'
        ) : null}
      </p>
      )}
    </div>
  );
}
