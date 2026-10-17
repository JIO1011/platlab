import { useEffect, useRef, useState } from 'react';

/** En qué va la cámara; las cuatro últimas son los motivos por los que no hay imagen. */
export type ScannerPhase = 'starting' | 'scanning' | 'denied' | 'no-camera' | 'insecure' | 'failed';

/** Lee un cuadro del video y devuelve el texto del QR, o `null` si no ve ninguno. */
interface Reader {
  read: (video: HTMLVideoElement) => Promise<string | null>;
  dispose: () => void;
}

/** El lector nativo del navegador (aún no está en los tipos de DOM). */
interface NativeDetector {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}
interface NativeDetectorConstructor {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

const SCAN_INTERVAL_MS = 150;

/**
 * `BarcodeDetector` con formato `qr_code` si el navegador lo trae; si no, la librería `qr-scanner`,
 * que se descarga solo en este momento (con su lector en un hilo aparte).
 */
async function createReader(): Promise<Reader> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector;
  if (Native) {
    const formats = (await Native.getSupportedFormats?.()) ?? ['qr_code'];
    if (formats.includes('qr_code')) {
      const detector = new Native({ formats: ['qr_code'] });
      return { read: async (video) => (await detector.detect(video))[0]?.rawValue ?? null, dispose: () => undefined };
    }
  }
  const { default: QrScanner } = await import('qr-scanner');
  const engine = await QrScanner.createQrEngine();
  return {
    read: async (video) => {
      try {
        return (await QrScanner.scanImage(video, { qrEngine: engine, returnDetailedScanResult: true, alsoTryWithoutScanRegion: true })).data;
      } catch {
        return null; // «No QR code found»: no hay nada que leer en este cuadro.
      }
    },
    dispose: () => {
      if (engine instanceof Worker) engine.terminate();
    },
  };
}

function initialPhase(): ScannerPhase {
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'no-camera';
  return 'starting';
}

function failurePhase(error: unknown): ScannerPhase {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'no-camera';
  return 'failed';
}

/**
 * Abre la cámara trasera mientras `active` y entrega cada texto leído a `onText`; si devuelve `true`
 * se acepta y la cámara se apaga en el acto. Al dejar de estar activo, o al desmontarse, siempre se
 * detienen todas las pistas del video y se libera el lector.
 */
export function useLabelScanner({ active, onText }: { active: boolean; onText: (text: string) => boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<ScannerPhase>(initialPhase);
  const [attempt, setAttempt] = useState(0);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video || initialPhase() !== 'starting') return undefined;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let reader: Reader | null = null;
    let timer: number | undefined;
    const stopCamera = () => {
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch (error) {
        if (!cancelled) setPhase(failurePhase(error));
        return;
      }
      if (cancelled) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      try {
        const created = await createReader();
        if (cancelled) {
          created.dispose();
          return;
        }
        reader = created;
      } catch {
        if (!cancelled) {
          stopCamera();
          setPhase('failed');
        }
        return;
      }
      setPhase('scanning');
      const tick = async () => {
        if (cancelled || !reader) return;
        if (video.readyState >= 2) {
          const text = await reader.read(video).catch(() => null);
          if (cancelled) return;
          if (text && onTextRef.current(text)) {
            stopCamera();
            return;
          }
        }
        timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
      };
      void tick();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopCamera();
      reader?.dispose();
    };
  }, [active, attempt]);

  return {
    videoRef,
    phase,
    retry: () => {
      setPhase('starting');
      setAttempt((value) => value + 1);
    },
  };
}
