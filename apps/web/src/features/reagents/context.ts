import type {
  IssueRequestItem,
  ProductDetail,
  Operation,
  OperationFacets,
  OperationTotals,
  Position,
  ProductList,
  ReagentsSummary,
  StockedProduct,
  WorkspaceMeResponse,
} from '@platlab/contracts';
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import type { MovementFilters, OperationQuery } from './movement-filters';

/** Hoja de registro que se abre, con lo que ya se conoce (reactivo o frasco de origen). */
export type SheetRequest =
  // «Nuevo reactivo» (ADR 0015): con `productId`, desde su ficha y con él ya elegido.
  | { kind: 'ingress'; productId?: string }
  // Con `position`, el frasco viaja en la petición (el de una etiqueta QR puede no estar en la lista global).
  | { kind: 'issue'; positionId?: string; productId?: string; position?: Position }
  // Desde la ficha ⚖ del frasco (ADR 0015, 14-10-2026): `mode: 'weight'` es «Corregir con la balanza» o «Pesar ahora»
  // (un frasco sin tara abre ya con la balanza por activar); `mode: 'quantity'` es «Escribir la cantidad».
  | { kind: 'adjustment'; positionId?: string; productId?: string; mode?: 'weight' | 'quantity' }
  // El frasco viaja en la petición: la lista global de frascos puede no incluirlo (llega por páginas).
  | { kind: 'transfer'; position: Position }
  // Mínimo (ADR 0012, 05-10-2026) y edición de la ficha (ADR 0015): desde la ficha del reactivo.
  | { kind: 'minimum'; productId: string }
  | { kind: 'product'; product: ProductDetail }
  // «Escanear» (14-10-2026): la hoja del lector de etiquetas QR; la abren la cabecera de la sección y la de la ficha.
  | { kind: 'scan' };

/**
 * Lo que el rol puede hacer hoy; `product` es administrar el catálogo (también el mínimo, crear
 * reactivos y ubicaciones desde el ingreso y editar la ficha), `receipt`, ingresar frascos, `lists`,
 * motivos, destinos y áreas, `approve`, aprobar salidas, y `transfer`, trasladar frascos (ADR 0012 y
 * 0015). Sin `approve`, la salida es una solicitud.
 */
export type Allowed = Record<'product' | 'receipt' | 'issue' | 'adjustment' | 'lists' | 'approve' | 'transfer', boolean>;

/** Lo que las secciones de la app de Reactivos comparten: datos ya pedidos, permisos y hojas. */
export interface ReagentsContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
  base: string;
  allowed: Allowed;
  products: UseQueryResult<ProductList>;
  productList: StockedProduct[];
  positions: UseInfiniteQueryResult<InfiniteData<{ items: Position[] }>>;
  positionList: Position[];
  operations: UseInfiniteQueryResult<InfiniteData<{ items: Operation[] }>>;
  /** Filtros de Movimientos leídos de la URL y su consulta a la API, con el periodo resuelto (ADR 0014). */
  movementFilters: MovementFilters;
  operationQuery: OperationQuery;
  /** Conteo por opción de cada filtro; solo se pide en Movimientos. */
  operationFacets: UseQueryResult<OperationFacets>;
  /** Totales (reporte): solo con `reagents.report.read` y la vista Totales. */
  operationTotals: UseQueryResult<OperationTotals>;
  summary: UseQueryResult<ReagentsSummary>;
  requests: UseQueryResult<{ canApprove: boolean; items: IssueRequestItem[] }>;
  /** Decidir solicitudes es resolver pendientes (ADR 0009): sigue permitido con el módulo en cierre. */
  canResolve: boolean;
  openSheet: (request: SheetRequest) => void;
  /** Cuándo se pidieron los datos de la sección y cómo volver a pedirlos (la ficha lleva su propia cabecera). */
  freshness: { updatedAt: number; refreshing: boolean; refresh: () => void };
  /** El hueco de la barra superior del shell: la ficha pone allí «Actualizado hace…» (ADR 0015, 14-10-2026). */
  topbarSlot: HTMLElement | null;
}

export const useReagents = () => useOutletContext<ReagentsContext>();
