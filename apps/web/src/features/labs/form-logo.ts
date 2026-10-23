import { FORM_LOGO_MAX_BYTES } from '@platlab/contracts';

/** Lo que admite el logo del membrete (ADR 0023): JPEG, PNG o WebP; el PNG conserva su fondo transparente, por eso no se reduce. */
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const LOGO_ACCEPT = LOGO_TYPES.join(',');

export type LogoFile = { body: Blob; type: (typeof LOGO_TYPES)[number] };

const isLogoType = (type: string): type is LogoFile['type'] => (LOGO_TYPES as readonly string[]).includes(type);

const kib = (bytes: number) => Math.round(bytes / 1024);

/** El archivo elegido listo para subir, o el motivo (en palabras de la pantalla) por el que no sirve. */
export function checkLogo(file: File): { logo: LogoFile } | { error: string } {
  if (!isLogoType(file.type)) return { error: 'El logo debe ser una imagen JPEG, PNG o WebP.' };
  if (file.size > FORM_LOGO_MAX_BYTES) return { error: `El logo pesa ${kib(file.size)} KiB y el máximo es ${kib(FORM_LOGO_MAX_BYTES)} KiB.` };
  return { logo: { body: file, type: file.type } };
}
