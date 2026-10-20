/** El día civil de un instante en la zona IANA del espacio, `YYYY-MM-DD` (en-CA lo escribe así; 03 §3). */
export const dayIn = (at: Date | string, timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(at));

/** Hoy en la zona del espacio, `YYYY-MM-DD`. */
export const todayIn = (timeZone: string) => dayIn(new Date(), timeZone);
