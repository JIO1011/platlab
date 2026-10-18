import { Button } from '@platlab/ui';

/** El motivo de archivar, a la vista y con su confirmación aquí mismo: archivar no se deshace desde esta pantalla. */
export function ConfirmArchive({
  label,
  text,
  action,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  label: string;
  text: string;
  action: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-3 rounded-control bg-surface-sunken p-3">
      <p className="text-sm text-ink">{text}</p>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="h-11 border-transparent bg-danger text-white hover:bg-danger/90 sm:h-10" loading={pending} onClick={onConfirm}>
          {action}
        </Button>
        <Button variant="ghost" className="h-11 sm:h-10" disabled={pending} onClick={onCancel} autoFocus>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
