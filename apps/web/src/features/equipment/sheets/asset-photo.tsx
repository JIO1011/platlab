import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@platlab/ui';
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

/**
 * «Foto» (opcional), junto a Tipo y Nombre: un cuadro pequeño con la foto (o una cámara punteada) que abre un menú con
 * «Tomar foto» (en el móvil abre la cámara), «Elegir foto» y, con una foto elegida, «Quitar». Con foto mostrada, los verbos
 * pasan a «Tomar otra» y «Elegir otra». Al editar, el cuadro parte de la foto del servidor (`currentUrl`); «Quitar» solo
 * descarta la elegida antes de enviar y no borra la del servidor. Los dos campos de archivo están ocultos y se abren desde
 * el menú.
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
    <div role="group" aria-labelledby={id} className="grid min-w-0 content-start gap-1.5">
      <p id={id} className={cn(fieldLabel, 'text-ink')}>
        Foto
        <span className="ml-1 font-normal text-ink-subtle">(opcional)</span>
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          aria-describedby={error ? errorId : undefined}
          aria-label={shown ? 'Foto del equipo: cambiar' : 'Foto del equipo: agregar'}
          className={cn(
            'group relative size-24 overflow-hidden rounded-2xl border text-ink-subtle transition-colors sm:size-32',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-wait',
            shown ? 'border-line' : 'border-dashed border-line-strong bg-white/40 hover:bg-white/70 hover:text-ink-muted',
          )}
        >
          {shown ? (
            <>
              <img
                src={shown}
                alt={chosen ? 'Vista previa de la foto elegida' : 'Foto actual del equipo'}
                className="size-full object-cover"
              />
              <span aria-hidden className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/65 py-1 text-xs font-medium text-white">
                <Camera className="size-3.5" />
                Cambiar
              </span>
            </>
          ) : (
            <span aria-hidden className="grid size-full place-content-center justify-items-center gap-1 text-xs font-medium">
              <Camera className="size-7" />
              Agregar
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          <DropdownMenuItem onSelect={() => cameraRef.current?.click()}>
            <Camera aria-hidden />
            {shown ? 'Tomar otra' : 'Tomar foto'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pickRef.current?.click()}>
            <ImagePlus aria-hidden />
            {shown ? 'Elegir otra' : 'Elegir foto'}
          </DropdownMenuItem>
          {chosen ? (
            <DropdownMenuItem onSelect={photo.clear}>
              <Trash2 aria-hidden />
              Quitar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
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
