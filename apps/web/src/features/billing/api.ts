import { useQueryClient } from '@tanstack/react-query';

import {
  getListDiseasesQueryKey,
  useListDiseases,
  useCreateDisease as useCreateDiseaseGenerated,
  useUpdateDisease as useUpdateDiseaseGenerated,
  useDeleteDisease as useDeleteDiseaseGenerated,
} from '@/lib/api/generated/diseases/diseases';
import {
  getListInvoicesQueryKey,
  useListInvoices,
  useGetMyInvoices,
  useCreateInvoice as useCreateInvoiceGenerated,
  useAddInvoiceItem as useAddInvoiceItemGenerated,
  useRemoveInvoiceItem as useRemoveInvoiceItemGenerated,
  useCheckoutInvoice as useCheckoutInvoiceGenerated,
  useCancelInvoice as useCancelInvoiceGenerated,
} from '@/lib/api/generated/invoices/invoices';
import type {
  CreateDiseaseRequest,
  DiseaseResponse,
  InvoiceResponse,
  InvoiceItemResponse,
  ListInvoicesParams,
  ListDiseasesParams,
} from '@/lib/api/generated/model';

export type { DiseaseResponse, InvoiceResponse, InvoiceItemResponse };

// ─── Diseases ──────────────────────────────────────────────────────────────

export function useDiseases(params: ListDiseasesParams) {
  return useListDiseases(params, { query: { staleTime: 5 * 60 * 1000 } });
}

function useInvalidateDiseases() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: getListDiseasesQueryKey() });
}

export function useCreateDisease() {
  const invalidate = useInvalidateDiseases();
  return useCreateDiseaseGenerated({ mutation: { onSuccess: invalidate } });
}

export function useUpdateDisease() {
  const invalidate = useInvalidateDiseases();
  return useUpdateDiseaseGenerated({ mutation: { onSuccess: invalidate } });
}

export function useDeleteDisease() {
  const invalidate = useInvalidateDiseases();
  return useDeleteDiseaseGenerated({ mutation: { onSuccess: invalidate } });
}

// ─── Invoices ──────────────────────────────────────────────────────────────

export function useInvoices(params: ListInvoicesParams) {
  return useListInvoices(params, { query: { staleTime: 30 * 1000 } });
}

export function useMyInvoices() {
  return useGetMyInvoices(
    { pageable: { page: 0, size: 50, sort: ['issuedAt,desc'] } },
    { query: { staleTime: 30 * 1000 } },
  );
}

function useInvalidateInvoices() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
}

export function useCreateInvoice() {
  const invalidate = useInvalidateInvoices();
  return useCreateInvoiceGenerated({ mutation: { onSuccess: invalidate } });
}

export function useAddInvoiceItem() {
  const invalidate = useInvalidateInvoices();
  return useAddInvoiceItemGenerated({ mutation: { onSuccess: invalidate } });
}

export function useRemoveInvoiceItem() {
  const invalidate = useInvalidateInvoices();
  return useRemoveInvoiceItemGenerated({ mutation: { onSuccess: invalidate } });
}

export function useCheckoutInvoice() {
  const invalidate = useInvalidateInvoices();
  return useCheckoutInvoiceGenerated({ mutation: { onSuccess: invalidate } });
}

export function useCancelInvoice() {
  const invalidate = useInvalidateInvoices();
  return useCancelInvoiceGenerated({ mutation: { onSuccess: invalidate } });
}

export type { CreateDiseaseRequest };
