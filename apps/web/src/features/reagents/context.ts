import type {
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
  | { kind: 'adjustment'; positionId?: string };

/** Lo que el rol puede hacer hoy; `lists` es administrar motivos y destinos (ADR 0012). */
export type Allowed = Record<'product' | 'receipt' | 'issue' | 'adjustment' | 'lists', boolean>;

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
  openSheet: (request: SheetRequest) => void;
}

export const useReagents = () => useOutletContext<ReagentsContext>();
