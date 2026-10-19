const styles = {
  /** «nov» */
  short: { month: 'short' },
  /** «nov 2025» */
  'short-year': { month: 'short', year: 'numeric' },
  /** «noviembre de 2025» */
  long: { month: 'long', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

/** «2026-11» → «nov», «nov 2026» o «noviembre de 2026». Los meses son del calendario del espacio: sin hora ni zona que convertir. */
export function monthName(month: string, style: keyof typeof styles): string {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-EC', { timeZone: 'UTC', ...styles[style] }).format(new Date(Date.UTC(year ?? 1970, (number ?? 1) - 1, 1)));
}
