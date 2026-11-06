/**
 * El oficio de Laboratorios (ADR 0023, «Color de Laboratorios»): formal y sobrio, como su Propuesta. Las tarjetas son
 * blancas, de radio generoso y con una sombra muy suave y larga, sin brillos; la acción principal, en el degradado de la
 * terracota. Las clases van completas para que Tailwind las encuentre.
 */
export const softCard =
  'rounded-card bg-surface shadow-[0_0_0_1px_var(--color-line),0_1px_2px_rgb(15_23_42/0.04),0_14px_32px_-20px_rgb(15_23_42/0.16)]';

/** La acción principal de una pantalla: el degradado de la acción a la arcilla, con una sombra suave del mismo tono. */
export const primaryGradient =
  'border-transparent bg-linear-to-br from-action to-action-deep shadow-md shadow-action/20 hover:from-action-hover hover:to-action-deep active:from-action-pressed';

/**
 * Las acciones de una pantalla: en una fila a la derecha desde `sm` y, en el móvil, en una barra fija al pie, siempre a
 * mano aunque la pantalla sea larga (la pantalla deja `pb-24` para que no tape nada). No se imprime.
 */
export const actionBar =
  'flex items-center gap-2 print:hidden max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:border-t max-sm:border-line max-sm:bg-surface/95 max-sm:px-3 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:backdrop-blur max-sm:[&>*]:flex-1';
