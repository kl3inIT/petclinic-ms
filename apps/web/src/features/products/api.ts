import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getListProductsQueryKey,
  useListProducts,
  useCreateProduct as useCreateProductGenerated,
  useUpdateProduct as useUpdateProductGenerated,
  useDeleteProduct as useDeleteProductGenerated,
} from '@/lib/api/generated/products/products';
import type {
  CreateProductRequest,
  ProductResponse,
  ListProductsParams,
  StockAdjustRequest,
} from '@/lib/api/generated/model';
import { apiMutator } from '@/lib/api/mutator';

export type { ProductResponse, CreateProductRequest };

export function useProducts(params: ListProductsParams) {
  return useListProducts(params, { query: { staleTime: 60 * 1000 } });
}

function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useCreateProductGenerated({ mutation: { onSuccess: invalidate } });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useUpdateProductGenerated({ mutation: { onSuccess: invalidate } });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useDeleteProductGenerated({ mutation: { onSuccess: invalidate } });
}

export function useRestockProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, data, idempotencyKey }: RestockProductVariables) =>
      apiMutator<ProductResponse>({
        url: `/api/v1/products/${id}/restock`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        data,
      }),
    onSuccess: invalidate,
  });
}

interface RestockProductVariables {
  id: number;
  data: StockAdjustRequest;
  idempotencyKey: string;
}
