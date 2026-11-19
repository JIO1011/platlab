import type { MemberRole } from '@platlab/contracts';

/**
 * Los roles que el Propietario asigna en Usuarios (ADR 0027), con lo que puede hacer cada uno; también nombran el rol
 * de una invitación en la entrada.
 * Docente, Estudiante y Visita tienen los mismos permisos: cambia el formato que llenan según su actividad.
 */
export const roles: ReadonlyArray<{ value: MemberRole; label: string; description: string }> = [
  { value: 'admin', label: 'Administrador', description: 'Configura el espacio, decide las solicitudes y ajusta existencias.' },
  { value: 'operator', label: 'Operador', description: 'Lleva el día a día: ingresos, salidas, entregas y devoluciones.' },
  { value: 'teacher', label: 'Docente', description: 'Pide prácticas con el formato de su actividad y reporta fallas.' },
  { value: 'student', label: 'Estudiante', description: 'Igual que el Docente: pide con el formato de su actividad (tesis).' },
  { value: 'visitor', label: 'Visita', description: 'Igual que el Docente: pide con el formato de su actividad.' },
];

export const roleLabel = (role: MemberRole) => roles.find((entry) => entry.value === role)?.label ?? role;
