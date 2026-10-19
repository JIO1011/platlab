/** Fechas y horas en la zona del espacio, nunca en la del navegador (03 §3: zona IANA del espacio). */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

/** Solo el día de un instante, «3 oct 2026», en la zona del espacio. */
export function formatDayInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-EC', { timeZone, dateStyle: 'medium' }).format(new Date(iso));
}

/** El día civil de un instante en la zona del espacio, AAAA-MM-DD (en-CA lo escribe así): ordena por día. */
export function dayInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

/**
 * Versión corta para listas estrechas: «1 oct, 8:23 p. m.»; el año solo si no es el actual. Con `alwaysYear`, siempre
 * lo lleva («1 oct 2026, 8:23 p. m.»): una línea de tiempo que mezcla años no puede dejarlo a la suposición.
 */
export function formatShortDateTime(iso: string, timeZone: string, alwaysYear = false): string {
  const date = new Date(iso);
  const year = (value: Date) => new Intl.DateTimeFormat('en', { timeZone, year: 'numeric' }).format(value);
  return new Intl.DateTimeFormat('es-EC', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: alwaysYear || year(date) !== year(new Date()) ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)),
  );
}

/** Fecha civil corta, «31/12/2026»: para fichas donde «31 dic 2026» no cabe. */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** «hace 2 min»: el tablero nunca promete «en vivo» (01 §7). */
export function formatAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return 'hace un momento';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}

/**
 * Cuánto falta o cuánto pasó desde una fecha civil: «hoy», «mañana», «en 3 meses», «hace 35 días».
 * Ambas fechas son AAAA-MM-DD y se comparan como días civiles, sin horas ni zonas.
 */
export function relativeDays(isoDate: string, today: string): string {
  const utc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  };
  const diff = Math.round((utc(isoDate) - utc(today)) / 86_400_000);
  const span = (days: number) =>
    days < 60
      ? `${days} ${days === 1 ? 'día' : 'días'}`
      : days < 730
        ? `${Math.round(days / 30)} meses`
        : `${Math.round(days / 365)} años`;
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  return diff < 0 ? `hace ${span(-diff)}` : `en ${span(diff)}`;
}

/** Suma días civiles a una fecha AAAA-MM-DD, sin horas ni zonas. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days)).toISOString().slice(0, 10);
}
