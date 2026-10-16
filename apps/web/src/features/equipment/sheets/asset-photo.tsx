import { Button, cn } from '@platlab/ui';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { fieldLabel } from '../../../app/filled';
import { shrinkPhoto, type PhotoType } from '../photo';

/** La foto elegida en la hoja, ya reducida, con la dirección local de su vista previa. */
type ChosenPhoto = { body: Blob; type: PhotoType; previewUrl: string };

const photoError = 'No se pudo leer la imagen o pesa más de 2 MiB; prueba con otra foto';

/** Lo que admite «Elegir foto»; la cámara pide cualquier imagen y el navegador la reduce a WebP o JPEG. */
const pickAccept = 'image/jpeg,image/png,image/webp,image/heic';

/**
 * La foto que la persona eligió o tomó en la hoja del equipo: la reduce en el navegador (`shrinkPhoto`) y
 * guarda el resultado con su vista previa local. No sube nada: quien envía la hoja lo hace al confirmarla.
 * Una foto que no se pudo leer deja el error en el campo y conserva la elegida antes.
 */
export function useChosenPhoto() {
  const [chosen, setChosen] = useState<ChosenPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Al reemplazar la foto, quitarla o cerrar la hoja se libera su vista previa.
  useEffect(() => {
    const url = chosen?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [chosen]);

  const choose = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const photo = await shrinkPhoto(file);
      if (!photo) {
        setError(photoError);
        return;
      }
      setChosen({ ...photo, previewUrl: URL.createObjectURL(photo.body) });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setChosen(null);
    setError(null);
  };

  return { chosen, error, busy, choose, clear };
}

const preview = 'size-24 shrink-0 rounded-2xl';

/**
 * «Foto» (opcional), al inicio de Identificación: «Tomar foto» (en el móvil abre la cámara) y «Elegir foto» (con foto mostrada, «Tomar otra» y «Elegir otra»; siempre disponibles),
 * con una vista previa cuadrada. Al editar, la vista previa parte de la foto del servidor (`currentUrl`);
 * «Quitar» solo descarta la elegida antes de enviar y no borra la del servidor. Los dos campos de archivo
 * están ocultos y se abren desde sus botones, que llevan texto y foco visible.
 */
export function PhotoField({
  photo,
  currentUrl,
}: {
  photo: ReturnType<typeof useChosenPhoto>;
  /** La foto que ya tiene el equipo (`photoUrl`); `null` sin foto o al registrar. */
  currentUrl: string | null;
}) {
  const id = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const { chosen, error, busy } = photo;
  const shown = chosen?.previewUrl ?? currentUrl;
  const errorId = `${id}-error`;

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Vacío el campo para poder elegir otra vez el mismo archivo.
    event.target.value = '';
    if (file) void photo.choose(file);
  };

  return (
    <div role="group" aria-labelledby={id} className="mb-4 grid gap-1.5">
      <p id={id} className={cn(fieldLabel, 'text-ink')}>
        Foto
        <span className="ml-1 font-normal text-ink-subtle">(opcional)</span>
      </p>
      <div className="flex items-center gap-4">
        {shown ? (
          <img
            src={shown}
            alt={chosen ? 'Vista previa de la foto elegida' : 'Foto actual del equipo'}
            className={cn(preview, 'border border-line object-cover')}
          />
        ) : (
          <span aria-hidden className={cn(preview, 'grid place-items-center border border-dashed border-line-strong bg-white/40 text-ink-subtle')}>
            <Camera className="size-7" />
          </span>
        )}
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button
            className="h-11 rounded-xl"
            aria-describedby={error ? errorId : undefined}
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera aria-hidden />
            {shown ? 'Tomar otra' : 'Tomar foto'}
          </Button>
          <Button
            className="h-11 rounded-xl"
            aria-describedby={error ? errorId : undefined}
            disabled={busy}
            onClick={() => pickRef.current?.click()}
          >
            <ImagePlus aria-hidden />
            {shown ? 'Elegir otra' : 'Elegir foto'}
          </Button>
          {chosen ? (
            <Button variant="ghost" className="h-11 rounded-xl" disabled={busy} onClick={photo.clear}>
              <Trash2 aria-hidden />
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} onChange={onFile} />
      <input ref={pickRef} type="file" accept={pickAccept} hidden tabIndex={-1} onChange={onFile} />
      {busy ? (
        <p role="status" className="text-[13px] text-ink-muted">
          Preparando la foto…
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
