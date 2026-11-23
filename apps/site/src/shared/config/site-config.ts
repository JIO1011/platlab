/**
 * Datos del sitio. `CONTENIDO_PROVISIONAL` mantiene el sitio fuera de los buscadores hasta que
 * haya dominio definitivo (ADR 0030, «Pendiente»); no muestra avisos a los visitantes.
 */
export const CONTENIDO_PROVISIONAL = true;

export const SITE = {
  nombre: "PlatLab",
  lema: "Gestión integral de laboratorios",
  descripcion:
    "Reactivos, equipos, laboratorios, mantenimiento y materiales en un solo espacio de trabajo, con aprobaciones, trazabilidad y roles.",
  // El Worker sirve el sitio y la app en el mismo dominio (ADR 0033); provisional hasta el definitivo (ADR 0030).
  url: "https://platlab.ohmroyal.org",
  /** La aplicación: a donde lleva «Iniciar sesión». */
  app: "https://platlab.ohmroyal.org",
  contacto: {
    /** El único canal de contacto del sitio. */
    correo: "contacto@ohmroyal.org",
  },
} as const;

export const ACCESO_APP = `${SITE.app}/acceso`;
export const HOST_APP = new URL(SITE.app).host;

const MENSAJE_DEMO = "Hola, quiero una demostración de PlatLab.\n\nInstitución:\nLaboratorios:\nMódulos de interés:";

/** Abre el correo con asunto y mensaje escritos: sin formulario ni servidor (ADR 0030). */
export function enlaceCorreo(asunto = "Solicitud de demostración de PlatLab", mensaje = MENSAJE_DEMO): string {
  return `mailto:${SITE.contacto.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
}
