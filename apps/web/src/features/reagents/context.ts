import type {
  IssueRequestItem,
  Operation,
  Position,
  ProductList,
  ReagentsSummary,
  StockedProduct,
  WorkspaceMeResponse,
} from '@platlab/contracts';
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import type { OperationFilter } from '../../app/queries';

/** Hoja de registro que se abre, con lo que ya se conoce (reactivo o frasco de origen). */
export type SheetRequest =
  | { kind: 'product' }
  | { kind: 'receipt'; productId?: string }
  | { kind: 'issue'; positionId?: string; productId?: string }
  | { kind: 'adjustment'; positionId?: string }
  // El frasco viaja en la petición: la lista global de frascos puede no incluirlo (llega por páginas).
  | { kind: 'transfer'; position: Position }
  | { kind: 'count' }
  // Mínimo (ADR 0012, 05-10-2026): desde la ficha del reactivo.
  | { kind: 'minimum'; productId: string };

/**
 * Lo que el rol puede hacer hoy; `product` es administrar el catálogo (también el mínimo), `lists`,
 * motivos y destinos, `approve`, aprobar salidas, y `transfer`, trasladar frascos (ADR 0012). Sin
 * `approve`, la salida es una solicitud.
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
  operationFilter: OperationFilter;
  summary: UseQueryResult<ReagentsSummary>;
  requests: UseQueryResult<{ canApprove: boolean; items: IssueRequestItem[] }>;
  /** Decidir solicitudes es resolver pendientes (ADR 0009): sigue permitido con el módulo en cierre. */
  canResolve: boolean;
  openSheet: (request: SheetRequest) => void;
}

export const useReagents = () => useOutletContext<ReagentsContext>();
