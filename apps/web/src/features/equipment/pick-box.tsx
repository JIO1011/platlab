/**
 * La casilla de una fila en el modo etiquetas (vista en lista): de 44 px de alto y por encima del enlace que
 * se extiende sobre la fila. `'mixed'` (algunas unidades de un tipo) se ve como indeterminada.
 */
export function PickBox({ checked, label, onChange }: { checked: boolean | 'mixed'; label: string; onChange: () => void }) {
  return (
    <label className="relative z-10 -my-2 flex size-11 cursor-pointer items-center justify-center rounded-control transition-colors hover:bg-action-soft">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked === true}
        ref={(input) => {
          if (input) input.indeterminate = checked === 'mixed';
        }}
        onChange={onChange}
        className="size-5 cursor-pointer accent-[var(--color-action)]"
      />
    </label>
  );
}
