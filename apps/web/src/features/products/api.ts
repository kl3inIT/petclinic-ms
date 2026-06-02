import { useQueryClient } from '@tanstack/react-query';

import {
  getListProductsQueryKey,
  useListProducts,
  useCreateProduct as useCreateProductGenerated,
  useUpdateProduct as useUpdateProductGenerated,
  useDeleteProduct as useDeleteProductGenerated,
  useRestockProduct as useRestockProductGenerated,
} from '@/lib/api/generated/products/products';
import type {
  CreateProductRequest,
  ProductResponse,
  ListProductsParams,
} from '@/lib/api/generated/model';

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
  return useRestockProductGenerated({ mutation: { onSuccess: invalidate } });
}
