import { StatCard, type StatCardProps } from '@platlab/ui';

/**
 * Indicador del Resumen que filtra la lista de su misma pantalla (hermano de `StatLink`, que navega): el botón
 * envuelve la tarjeta y `aria-pressed` dice cuál filtro está puesto. Su nombre accesible es la etiqueta, la cifra y su línea.
 */
export function StatButton({ pressed, onPress, ...stat }: { pressed: boolean; onPress: () => void } & StatCardProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className="group block rounded-card text-left transition-shadow duration-150 focus-visible:outline-offset-4 aria-pressed:ring-2 aria-pressed:ring-action"
    >
      <StatCard {...stat} />
    </button>
  );
}
