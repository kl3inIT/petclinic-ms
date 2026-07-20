import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiMutator } from '@/lib/api/mutator';
import { getListProductsQueryKey } from '@/lib/api/generated/products/products';

export interface StockMovement {
  id?: number;
  operationId?: number;
  idempotencyKey?: string;
  operationType?: 'INITIAL' | 'CONSUME' | 'RESTOCK' | 'ADJUSTMENT';
  sourceType?: string;
  sourceId?: string;
  reason?: string;
  productId?: number;
  productCode?: string;
  quantityDelta?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  createdBy?: string;
  createdDate?: string;
}

export interface MovementPage {
  content?: StockMovement[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

export type StockMovementDirection = 'IN' | 'OUT';

export interface StockDocumentLine {
  productId: number;
  quantity: number;
}

export interface ManualStockDocumentRequest {
  idempotencyKey: string;
  direction: StockMovementDirection;
  reason: string;
  reference?: string;
  items: StockDocumentLine[];
}

export interface InventoryOperation {
  id?: number;
  operationType?: StockMovement['operationType'];
  sourceType?: string;
  sourceId?: string;
  reason?: string;
  movements?: StockMovement[];
}

export function useStockMovements(productId: number | undefined) {
  return useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: () =>
      apiMutator<MovementPage>({
        url: `/api/v1/products/stock/${productId}/movements`,
        method: 'GET',
        params: { page: 0, size: 100, sort: ['createdDate,desc'] },
      }),
    enabled: productId != null,
    staleTime: 30_000,
  });
}

export function useInventoryMovements(size = 100, enabled = true, page = 0) {
  return useQuery({
    queryKey: ['inventory-movements', page, size],
    queryFn: () =>
      apiMutator<MovementPage>({
        url: '/api/v1/products/stock/movements',
        method: 'GET',
        params: { page, size, sort: ['createdDate,desc'] },
      }),
    enabled,
    staleTime: 30_000,
  });
}

export function useRecordStockDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ManualStockDocumentRequest) =>
      apiMutator<InventoryOperation>({
        url: '/api/v1/products/stock/documents',
        method: 'POST',
        data,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ['inventory-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
      ]);
    },
  });
}
