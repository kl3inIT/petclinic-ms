import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useGetMyOwnerProfile } from '@/lib/api/generated/owners/owners';
import { useCancelVisit, useSearchVisits } from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { type SearchVisitsParams } from '@/lib/api/generated/model';

import { useVetMap } from '@/features/vets/useVetMap';
import { useCustomerVetRatingStates } from '@/features/vets/customer-rating-state';
import {
  ALL,
  PAGE_SIZE,
  hasVisitFee,
  matchesMonthFilter,
  type FeeFilter,
  type MonthFilter,
  type StatusFilter,
  type VetFilter,
} from './utils';

/** Lấy nhiều visit một lần rồi lọc/phân trang client-side (giữ nguyên hành vi cũ). */
const FETCH_SIZE = 50;

export function useCustomerVisits() {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [vetFilter, setVetFilter] = useState<VetFilter>(ALL);
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [page, setPage] = useState(0);

  const params: SearchVisitsParams = {
    pageable: {
      page: 0,
      size: FETCH_SIZE,
      sort: [`scheduledAt,${sortOrder}`, `id,${sortOrder}`],
    },
    ...(statusFilter !== ALL ? { status: statusFilter } : {}),
  };

  const listQuery = useSearchVisits(params);
  const ownerQuery = useGetMyOwnerProfile();
  const { vetMap } = useVetMap();

  const visitsLoading = listQuery.isLoading || listQuery.isError;
  const ownerPets = useMemo(() => ownerQuery.data?.pets ?? [], [ownerQuery.data]);
  const visits = useMemo(() => listQuery.data?.content ?? [], [listQuery.data?.content]);
  const completedVetIds = useMemo(
    () =>
      visits
        .filter(
          (visit) =>
            visit.status === VisitResponseStatus.COMPLETED && visit.vetId !== undefined,
        )
        .map((visit) => visit.vetId as number),
    [visits],
  );
  const ratingStates = useCustomerVetRatingStates(completedVetIds);

  // Danh sách bác sĩ xuất hiện trong các visit hiện có — dùng cho dropdown lọc.
  const vetOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const v of visits) if (v.vetId !== undefined) ids.add(v.vetId);
    return [...ids].map((id) => ({
      id,
      label: vetMap.get(id)?.fullName ?? `BS #${id}`,
    }));
  }, [visits, vetMap]);

  // Hero hiển thị thú cưng "trọng tâm" — ưu tiên pet có lịch SCHEDULED gần nhất,
  // không có thì lấy pet đầu tiên trong hồ sơ.
  const focusPet = useMemo(() => {
    const nextScheduled = visits.find((v) => v.status === 'SCHEDULED');
    const focusId = nextScheduled?.petId ?? ownerPets[0]?.id;
    return ownerPets.find((p) => p.id === focusId) ?? ownerPets[0];
  }, [visits, ownerPets]);

  const filteredVisits = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return visits.filter((visit) => {
      if (!matchesMonthFilter(visit, monthFilter)) return false;
      if (vetFilter !== ALL && String(visit.vetId) !== vetFilter) return false;
      if (feeFilter === 'paid' && !hasVisitFee(visit)) return false;
      if (feeFilter === 'unpaid' && hasVisitFee(visit)) return false;
      if (!keyword) return true;

      const text = [
        visit.reason,
        visit.diagnosis,
        visit.treatment,
        visit.petName,
        visit.vetId ? vetMap.get(visit.vetId)?.fullName : '',
        visit.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [visits, monthFilter, vetFilter, feeFilter, search, vetMap]);

  useEffect(() => {
    setPage(0);
  }, [vetFilter, feeFilter, monthFilter, search, sortOrder, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleVisits = filteredVisits.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const counts = {
    scheduled: visits.filter((v) => v.status === VisitResponseStatus.SCHEDULED).length,
    completed: visits.filter((v) => v.status === VisitResponseStatus.COMPLETED).length,
    inProgress: visits.filter((v) => v.status === VisitResponseStatus.IN_PROGRESS).length,
    cancelled: visits.filter((v) => v.status === VisitResponseStatus.CANCELLED).length,
  };

  const cancelMutation = useCancelVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đã huỷ lịch khám');
        void qc.invalidateQueries({
          predicate: (q) => {
            const first = q.queryKey[0];
            return typeof first === 'string' && first.startsWith('/api/v1/visits');
          },
        });
      },
      onError: (err: Error) => toast.error(err.message || 'Huỷ thất bại'),
    },
  });

  return {
    // filters
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    sortOrder,
    setSortOrder,
    monthFilter,
    setMonthFilter,
    vetFilter,
    setVetFilter,
    feeFilter,
    setFeeFilter,
    resetFilters: () => {
      setStatusFilter(ALL);
      setMonthFilter('all');
      setVetFilter(ALL);
      setFeeFilter('all');
      setSearch('');
    },
    // data
    visitsLoading,
    ownerPets,
    focusPet,
    vetMap,
    vetOptions,
    ratingStates,
    filteredVisits,
    visibleVisits,
    counts,
    // pagination
    page: currentPage,
    setPage,
    totalPages,
    // actions
    cancelMutation,
  };
}

export type UseCustomerVisits = ReturnType<typeof useCustomerVisits>;
export type { VisitResponse };
