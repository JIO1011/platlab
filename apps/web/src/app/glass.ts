/**
 * Vidrio de la ficha (ADR 0010, «Ventanas como ReactiLab»): blanco al 70 % sobre el fondo del módulo,
 * desenfocado y con borde blanco translúcido. Sin `backdrop-filter`, sólido. Solo la cabecera lo lleva;
 * el resumen es un panel blanco y los frascos, translúcidos sin desenfoque, para que el desplazamiento
 * sea fluido.
 */
export const glassCard =
  'rounded-[28px] border border-white/70 bg-white/70 shadow-raised backdrop-blur-xl backdrop-saturate-150 not-supports-[backdrop-filter]:bg-surface';

/** Botón redondo de las acciones secundarias de la cabecera: solo icono, 40 px, borde suave; marcado, relleno suave. */
export const iconAction =
  'size-11 sm:size-10 rounded-full border-line-strong bg-white/80 text-action hover:bg-white aria-pressed:border-action/40 aria-pressed:bg-action-soft [&_svg]:size-[18px]';

/** La acción primaria de una cabecera de ficha: alta, redondeada, en degradado de la acción, con icono. */
export const primaryAction =
  'h-14 rounded-2xl bg-linear-to-r from-action to-action-deep px-6 text-base font-bold shadow-lg shadow-action/25 hover:from-action-hover hover:to-action-deep [&_svg]:size-5';
