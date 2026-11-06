import { scheduleProblemText, type ApprovalResults, type ApprovedRequest, type RequestSummary } from '@platlab/contracts';
import { MISSING_HOLDS } from './schedule-grid';

/** «A», «A y B», «A, B y C». */
const listText = (codes: readonly string[]): string => (codes.length < 2 ? (codes[0] ?? '') : `${codes.slice(0, -1).join(', ')} y ${codes.at(-1)}`);

/** «P1-S11-QUI02 y P1-S12-QUI01 programados»: lo que se programó, con los códigos de los bloques. */
export const programmedText = (codes: readonly string[]): string => (codes.length === 0 ? 'Aprobada' : `${listText(codes)} ${codes.length === 1 ? 'programado' : 'programados'}`);

/** El aviso al aprobar una solicitud: los códigos programados y, aparte, lo que solo avisa (el aforo y lo que falta apartar). */
export function approvedMessage(items: ApprovedRequest['items']): { title: string; description?: string } {
  const notes = [...(items.some((item) => item.warnings.includes('capacity')) ? [scheduleProblemText.capacity] : []), ...(items.every((item) => item.activity.complete) ? [] : [MISSING_HOLDS])];
  const title = programmedText(items.map((item) => item.activity.code));
  return notes.length > 0 ? { title, description: notes.join('. ') } : { title };
}

/** Qué solicitudes se pueden aprobar desde la lista: las enviadas. */
export const isApprovable = (item: Pick<RequestSummary, 'status'>): boolean => item.status === 'submitted';

/** El cuerpo de aprobar varias: cada solicitud con la versión que se vio. */
export const approveBody = (items: ReadonlyArray<Pick<RequestSummary, 'id' | 'version'>>) => ({
  items: items.map((item) => ({ requestId: item.id, expectedVersion: item.version })),
});

export interface ApprovalLine {
  requestId: string;
  /** El código de la solicitud y su título, para reconocerla. */
  name: string;
  ok: boolean;
  /** Lo programado con sus códigos o el motivo del servidor. */
  text: string;
}

/** El resumen de aprobar varias: una línea por solicitud, en el orden en que se pidieron, y cuántas salieron bien. */
export function approvalSummary(
  results: ApprovalResults['items'],
  requests: ReadonlyArray<Pick<RequestSummary, 'id' | 'code' | 'title'>>,
): { lines: ApprovalLine[]; programmed: number; failed: number } {
  const lines = results.map((result): ApprovalLine => {
    const request = requests.find((item) => item.id === result.requestId);
    return {
      requestId: result.requestId,
      name: request ? [request.code, request.title].filter(Boolean).join(' · ') : 'Solicitud',
      ok: result.ok,
      text: result.ok ? programmedText(result.codes) : (result.message ?? 'No se pudo programar.'),
    };
  });
  const programmed = lines.filter((line) => line.ok).length;
  return { lines, programmed, failed: lines.length - programmed };
}
