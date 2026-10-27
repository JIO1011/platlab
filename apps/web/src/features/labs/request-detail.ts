import type { RequestLine } from '@platlab/contracts';
import { formatDecimal, ratioPercent } from '@platlab/ui';
import { formatDate } from '../../app/format';
import type { RequestView } from './request-draft';
import { lineChecks } from './request-line-check';
import { shortDateText } from './schedule-placement';

/**
 * Lo que el detalle de una solicitud recibida dice de ella, sin pintar nada: las cuatro cifras de arriba, la tabla de
 * recursos con su barra y las comprobaciones de «Revisión». Todo sale de lo que ya devuelve la API.
 */

type Verdict = RequestLine['check'];
type Tone = 'success' | 'warning' | 'neutral';

// ---------------------------------------------------------------------------
// Cifras
// ---------------------------------------------------------------------------

export interface Figure {
  key: 'dates' | 'time' | 'lab' | 'people';
  label: string;
  value: string;
  /** Líneas de apoyo bajo la cifra. */
  hints: string[];
  /** Falta el dato: el ícono se tiñe de aviso y la cifra lo dice con texto («Sin elegir»). */
  missing: boolean;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Las cuatro cifras: fecha(s), horario, laboratorio (su sigla) y participantes con sus grupos. */
export function figuresOf(
  request: Pick<RequestView, 'dates' | 'dateCount' | 'scheduledCount' | 'startsAt' | 'endsAt' | 'areaId' | 'participants' | 'groups' | 'blocks'>,
  space: { abbreviation: string; areaName: string } | undefined,
): Figure[] {
  const dates = [...request.dates].sort();
  const scheduled = request.scheduledCount === 0 ? [] : [request.dateCount === 1 ? 'Programada' : `${request.scheduledCount} de ${request.dateCount} programadas`];
  const areas = [...new Set(request.blocks.map((block) => block.areaName))];
  const hasTime = request.startsAt !== null && request.endsAt !== null;
  return [
    {
      key: 'dates',
      label: dates.length > 1 ? 'Fechas pedidas' : 'Fecha pedida',
      value: dates.length === 0 ? 'Sin fecha' : dates.length === 1 ? formatDate(dates[0]!) : count(dates.length, 'fecha', 'fechas'),
      hints: [...(dates.length > 1 ? [dates.map(shortDateText).join(' · ')] : []), ...scheduled],
      missing: dates.length === 0,
    },
    { key: 'time', label: 'Horario', value: hasTime ? `${request.startsAt}–${request.endsAt}` : 'Sin horario', hints: [], missing: !hasTime },
    {
      key: 'lab',
      label: 'Laboratorio',
      // Programada, manda dónde quedó; si no, el laboratorio pedido.
      value: areas.length > 0 ? areas.join(' y ') : request.areaId === null ? 'Sin elegir' : (space?.abbreviation ?? '—'),
      hints: areas.length > 0 ? ['Programada'] : space && request.areaId !== null ? [space.areaName] : [],
      missing: areas.length === 0 && request.areaId === null,
    },
    {
      key: 'people',
      label: 'Participantes',
      value: request.participants === null ? 'Sin dato' : String(request.participants),
      hints: [count(request.groups, 'grupo', 'grupos')],
      missing: request.participants === null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Recursos
// ---------------------------------------------------------------------------

export interface ResourceRow {
  /** El número de la línea en la solicitud, desde 1. */
  line: number;
  name: string;
  /** Lo pedido por fecha, con su unidad. */
  requested: string;
  /** Lo que hay (o, con `held`, lo apartado en la fecha que más le falta); nulo si nada lo verifica. */
  available: string | null;
  held: boolean;
  /** Cuánto de lo pedido cubre `available`, de 0 a 100; nulo si no hay con qué medirlo. */
  percent: number | null;
  tone: Tone;
  /** El estado, siempre con texto: Alcanza, No alcanza, Sin verificar, Apartado o Falta. */
  status: string;
}

const percentOf = (part: number, whole: number): number | null => (whole <= 0 ? null : Math.min(100, Math.floor((part * 100) / whole)));

const amountText = (line: RequestLine, value: string | number): string =>
  line.kind === 'reagent' ? `${formatDecimal(String(value))} ${line.unit}`.trim() : formatDecimal(String(value));

type Hold = RequestView['blocks'][number]['holds'][number];

const holdPercent = (line: RequestLine, hold: Hold): number | null =>
  line.kind === 'reagent' ? ratioPercent(hold.held, line.quantity) : line.kind === 'equipment' ? percentOf(hold.assets.length, line.quantity) : null;

/** De las fechas programadas, la que menos apartó: es la que dice si la línea alcanza. */
function leastHeld(line: RequestLine, holds: readonly Hold[]): { hold: Hold; percent: number | null } | null {
  const measured = holds.map((hold) => ({ hold, percent: holdPercent(line, hold) }));
  return measured.reduce<{ hold: Hold; percent: number | null } | null>((worst, next) => {
    if (worst === null) return next;
    const rank = (item: { hold: Hold; percent: number | null }) => (item.hold.complete ? 101 : (item.percent ?? 0));
    return rank(next) < rank(worst) ? next : worst;
  }, null);
}

/**
 * La tabla «Recursos»: por línea, lo pedido y lo disponible (la barra es la parte de lo pedido que se cubre). Con
 * fechas ya programadas, lo disponible es lo apartado: «Apartado» si alcanzó y «Falta» si no. El material no se reserva
 * ni tiene existencias: queda «Sin verificar», sin barra.
 */
export function resourceRows(request: Pick<RequestView, 'lines' | 'blocks'>): ResourceRow[] {
  return request.lines.map((line, index): ResourceRow => {
    const base = { line: index + 1, name: line.name, requested: amountText(line, line.quantity) };
    const holds = request.blocks.flatMap((block) => block.holds.filter((hold) => hold.line === index + 1));
    const least = line.kind === 'material' ? null : leastHeld(line, holds);
    if (least) {
      return {
        ...base,
        available: amountText(line, line.kind === 'equipment' ? least.hold.assets.length : least.hold.held),
        held: true,
        percent: least.percent,
        tone: least.hold.complete ? 'success' : 'warning',
        status: least.hold.complete ? 'Apartado' : 'Falta',
      };
    }
    const check = lineChecks[line.check];
    const available = line.kind === 'material' ? null : line.available;
    const percent = line.kind === 'reagent' ? (line.available === null ? null : ratioPercent(line.available, line.quantity)) : line.kind === 'equipment' && line.available !== null ? percentOf(line.available, line.quantity) : null;
    return { ...base, available: available === null ? null : amountText(line, available), held: false, percent, tone: check.tone, status: check.label };
  });
}

// ---------------------------------------------------------------------------
// Revisión
// ---------------------------------------------------------------------------

/** Una comprobación de «Revisión»: su categoría, cómo salió (con texto) y, si aplica, de cuántas líneas o fechas habla. */
export interface ReviewItem {
  key: string;
  label: string;
  verdict: Verdict;
  text: string;
  detail: string | null;
}

const categories = [
  { kind: 'reagent', label: 'Reactivos' },
  { kind: 'equipment', label: 'Equipos' },
  { kind: 'material', label: 'Materiales' },
] as const;

/** Lo peor que dijo el servidor de las líneas de la categoría: ⚠ pesa más que ✖ y este más que ✔. */
const worst = (checks: readonly Verdict[]): Verdict => (checks.includes('short') ? 'short' : checks.includes('unverified') ? 'unverified' : 'ok');

/**
 * Las comprobaciones de la solicitud, solo con lo que ya devuelve la API: si pidió laboratorio y horario; por categoría con
 * líneas, el ✔ ⚠ ✖ que el servidor puso a cada una; el plazo, y, si hay fechas programadas con lo apartado, si alcanzó en todas.
 */
export function reviewItems(request: Pick<RequestView, 'lines' | 'late' | 'blocks' | 'areaId' | 'startsAt' | 'endsAt'>): ReviewItem[] {
  const resources = categories.flatMap(({ kind, label }): ReviewItem[] => {
    const lines = request.lines.filter((line) => line.kind === kind);
    if (lines.length === 0) return [];
    const verdict = worst(lines.map((line) => line.check));
    const flagged = lines.filter((line) => line.check !== 'ok').length;
    return [{ key: kind, label, verdict, text: lineChecks[verdict].label, detail: flagged === 0 ? count(lines.length, 'línea', 'líneas') : `${flagged} de ${count(lines.length, 'línea', 'líneas')} con aviso` }];
  });
  const held = request.blocks.filter((block) => block.holds.length > 0);
  const complete = held.filter((block) => block.holds.every((hold) => hold.complete)).length;
  const hasTime = request.startsAt !== null && request.endsAt !== null;
  return [
    request.blocks.length > 0
      ? { key: 'laboratorio', label: 'Laboratorio', verdict: 'ok', text: 'Programada', detail: null }
      : request.areaId === null
        ? { key: 'laboratorio', label: 'Laboratorio', verdict: 'short', text: 'Sin elegir', detail: 'Se programa en el Cronograma' }
        : { key: 'laboratorio', label: 'Laboratorio', verdict: 'ok', text: 'Elegido', detail: null },
    hasTime ? { key: 'horario', label: 'Horario', verdict: 'ok', text: 'Completo', detail: null } : { key: 'horario', label: 'Horario', verdict: 'short', text: 'Sin horario', detail: null },
    ...resources,
    { key: 'plazo', label: 'Plazo', verdict: request.late ? 'short' : 'ok', text: request.late ? 'Fuera de plazo' : 'En plazo', detail: null },
    ...(held.length > 0
      ? [{ key: 'apartado', label: 'Apartado', verdict: complete === held.length ? 'ok' : 'short', text: complete === held.length ? 'Completo' : 'Falta apartar', detail: `${complete} de ${count(held.length, 'fecha', 'fechas')}` } satisfies ReviewItem]
      : []),
  ];
}
