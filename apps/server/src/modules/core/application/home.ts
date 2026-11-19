import type {
  AgendaItem,
  HomeActivity,
  HomeAgendaResponse,
  HomeCalendarResponse,
  HomeResponse,
  HomeTask,
  HomeTrend,
} from '@platlab/contracts';
import { moduleRegistry, type ModuleManifest } from '@platlab/modules';
import { addDays, monthDays, todayIn } from '../../../platform/dates.js';
import type { WorkspaceAccess } from './access.js';
import type { WorkspaceView } from './workspace-view.js';

/** Lo que cada módulo aporta a su tarjeta de Inicio: contadores, gráfico y actividad reciente. */
export interface HomeContribution {
  summary: Record<string, number>;
  activity: HomeActivity[];
  trend: HomeTrend | null;
}

/** Cuántas actividades de un tipo tiene un día. */
interface AgendaCount {
  date: string;
  type: string;
  count: number;
}

/**
 * Actividades con fecha de un módulo (ADR 0026), ya filtradas por el ámbito del miembro. `today` es hoy en la zona del
 * espacio: un día pasado solo muestra lo hecho. `counts` sigue la misma regla que `day` y omite los ceros.
 */
export interface AgendaContribution {
  day(access: WorkspaceAccess, date: string, today: string): Promise<Omit<AgendaItem, 'moduleCode'>[]>;
  counts(access: WorkspaceAccess, from: string, to: string, today: string): Promise<AgendaCount[]>;
}

/** Las filas de «Por atender» de un módulo, cada una con el permiso que exige; las de cifra 0 no se muestran. */
export type TaskContribution = (access: WorkspaceAccess) => Promise<Omit<HomeTask, 'moduleCode'>[]>;

/** Lo que un módulo aporta al Inicio. Core no importa módulos: la composición se lo pasa (02 §3). */
export interface HomeModule {
  card?: (access: WorkspaceAccess) => Promise<HomeContribution>;
  agenda?: AgendaContribution;
  tasks?: TaskContribution;
}

export type HomeModules = Record<string, HomeModule>;

/** Si hoy no queda nada por iniciar, lo próximo se busca en estos días (ADR 0026, «Diseño de IN-01»). */
const NEXT_DAYS = 60;

type Slot = 'homeCard' | 'homeAgenda' | 'homeTasks';

/**
 * Los módulos que aportan a un panel: visibles, que admiten consulta y cuyo permiso del aporte (en el manifiesto) tiene
 * el miembro. El ámbito dentro del aporte lo aplica cada módulo.
 */
function contributors(view: WorkspaceView, slot: Slot): WorkspaceView['modules'] {
  return view.modules.filter((module) => {
    const manifest: ModuleManifest | undefined = moduleRegistry.find((entry) => entry.code === module.code);
    const permission = manifest?.[slot]?.permission;
    return permission !== undefined && module.access.includes('read_export') && view.permissions.includes(permission);
  });
}

/** Tarjetas de Inicio: módulos que se pueden consultar y cuyo permiso de tarjeta tiene el miembro. */
export async function homeCards(access: WorkspaceAccess, view: WorkspaceView, modules: HomeModules): Promise<HomeResponse['cards']> {
  const cards: HomeResponse['cards'] = [];
  for (const module of contributors(view, 'homeCard')) {
    const contribution = (await modules[module.code]?.card?.(access)) ?? null;
    cards.push({
      moduleCode: module.code,
      name: module.name,
      summary: contribution?.summary ?? null,
      activity: contribution?.activity ?? [],
      trend: contribution?.trend ?? null,
    });
  }
  return cards;
}

function agendaSources(view: WorkspaceView, modules: HomeModules): Array<{ code: string; agenda: AgendaContribution }> {
  return contributors(view, 'homeAgenda').flatMap((module) => {
    const agenda = modules[module.code]?.agenda;
    return agenda ? [{ code: module.code, agenda }] : [];
  });
}

type AgendaSources = ReturnType<typeof agendaSources>;

/** Lo de todo el día primero; después, por hora. */
const byTime = (a: AgendaItem, b: AgendaItem) =>
  (a.startsAt ?? '').localeCompare(b.startsAt ?? '') || (a.endsAt ?? '').localeCompare(b.endsAt ?? '') || a.title.localeCompare(b.title);

async function dayOf(access: WorkspaceAccess, sources: AgendaSources, date: string, today: string) {
  const items: AgendaItem[] = [];
  for (const { code, agenda } of sources) {
    items.push(...(await agenda.day(access, date, today)).map((item) => ({ moduleCode: code, ...item })));
  }
  return { date, items: items.sort(byTime) };
}

async function countsOf(access: WorkspaceAccess, sources: AgendaSources, from: string, to: string, today: string) {
  const counts: Array<AgendaCount & { moduleCode: string }> = [];
  for (const { code, agenda } of sources) {
    counts.push(...(await agenda.counts(access, from, to, today)).filter((row) => row.count > 0).map((row) => ({ moduleCode: code, ...row })));
  }
  return counts;
}

/**
 * Actividad (ADR 0026): lo de un día, hoy por defecto. Si el día es hoy y no queda nada por iniciar, también el
 * próximo día con algo en los siguientes 60.
 */
export async function homeAgenda(access: WorkspaceAccess, view: WorkspaceView, modules: HomeModules, date?: string): Promise<HomeAgendaResponse> {
  const { timeZone } = access.workspace;
  const today = todayIn(timeZone);
  const sources = agendaSources(view, modules);
  const day = await dayOf(access, sources, date ?? today, today);
  let next: HomeAgendaResponse['next'] = null;
  if (day.date === today && !day.items.some((item) => item.status === 'upcoming')) {
    const ahead = await countsOf(access, sources, addDays(today, 1), addDays(today, NEXT_DAYS), today);
    const first = ahead.map((row) => row.date).sort()[0];
    if (first) next = await dayOf(access, sources, first, today);
  }
  return { today, timeZone, day, next };
}

/** Calendario (ADR 0026): todos los días del mes, el actual por defecto, con lo que tiene cada uno por tipo. */
export async function homeCalendar(access: WorkspaceAccess, view: WorkspaceView, modules: HomeModules, month?: string): Promise<HomeCalendarResponse> {
  const today = todayIn(access.workspace.timeZone);
  const shown = month ?? today.slice(0, 7);
  const dates = monthDays(shown);
  const counts = await countsOf(access, agendaSources(view, modules), dates[0]!, dates.at(-1)!, today);
  return {
    month: shown,
    today,
    days: dates.map((date) => {
      const own = counts.filter((row) => row.date === date).map(({ moduleCode, type, count }) => ({ moduleCode, type, count }));
      return { date, total: own.reduce((sum, row) => sum + row.count, 0), counts: own };
    }),
  };
}

/** Por atender (ADR 0026): una fila por tipo de tarea con algo pendiente, lo rojo antes que lo ámbar. */
export async function homeTasks(access: WorkspaceAccess, view: WorkspaceView, modules: HomeModules): Promise<HomeTask[]> {
  const tasks: HomeTask[] = [];
  for (const module of contributors(view, 'homeTasks')) {
    const rows = (await modules[module.code]?.tasks?.(access)) ?? [];
    tasks.push(...rows.filter((row) => row.count > 0).map((row) => ({ moduleCode: module.code, ...row })));
  }
  return tasks.sort((a, b) => Number(b.tone === 'danger') - Number(a.tone === 'danger'));
}
