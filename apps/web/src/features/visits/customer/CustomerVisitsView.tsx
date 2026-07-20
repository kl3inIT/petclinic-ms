import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';

import { RateVetDialog } from '@/features/vets/components/RateVetDialog';

import { useCustomerVisits } from './useCustomerVisits';
import { fullDateFmt } from './utils';
import { EmptyState } from './parts';
import { CustomerVisitHero } from './CustomerVisitHero';
import { CustomerVisitMetrics } from './CustomerVisitMetrics';
import { CustomerVisitFilters } from './CustomerVisitFilters';
import { CustomerVisitRow } from './CustomerVisitRow';
import { CustomerVisitDetailDialog } from './CustomerVisitDetailDialog';
import { RescheduleDialog } from './RescheduleDialog';
import { AdvancedFilterDialog } from './AdvancedFilterDialog';

export function CustomerVisitsView() {
  const vm = useCustomerVisits();

  const [detailTarget, setDetailTarget] = useState<VisitResponse | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<VisitResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VisitResponse | null>(null);
  const [rateTarget, setRateTarget] = useState<VisitResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  /**
   * Map petId → photoUrl từ ownerPets để truyền xuống từng row.
   * Ảnh được serve qua MinIO (URL từ BE), null = dùng emoji fallback.
   */
  const petPhotoMap = useMemo(
    () => new Map(vm.ownerPets.map((p) => [p.id ?? -1, p.photoUrl ?? null])),
    [vm.ownerPets],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <CustomerVisitHero focusPet={vm.focusPet} />

      <CustomerVisitMetrics counts={vm.counts} onFilter={vm.setStatusFilter} />

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <CustomerVisitFilters
          search={vm.search}
          setSearch={vm.setSearch}
          statusFilter={vm.statusFilter}
          setStatusFilter={vm.setStatusFilter}
          monthFilter={vm.monthFilter}
          setMonthFilter={vm.setMonthFilter}
          sortOrder={vm.sortOrder}
          setSortOrder={vm.setSortOrder}
          onOpenAdvanced={() => setAdvancedOpen(true)}
        />

        <div className="space-y-1 p-3">
          {vm.visitsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-lg" />
            ))
          ) : vm.filteredVisits.length === 0 ? (
            <EmptyState />
          ) : (
            vm.visibleVisits.map((visit, index) => (
              <CustomerVisitRow
                key={visit.id ?? index}
                visit={visit}
                vetMap={vm.vetMap}
                petPhotoUrl={
                  visit.petId !== undefined ? petPhotoMap.get(visit.petId) : null
                }
                onDetail={() => setDetailTarget(visit)}
                onReschedule={() => setRescheduleTarget(visit)}
                onCancel={() => setCancelTarget(visit)}
                onRate={() => setRateTarget(visit)}
                ratingState={
                  visit.vetId !== undefined
                    ? (vm.ratingStates.get(visit.vetId) ?? 'checking')
                    : 'unavailable'
                }
              />
            ))
          )}
        </div>

        {vm.filteredVisits.length > 0 ? (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 py-3">
            <Button
              variant="outline"
              size="icon-xs"
              className="border-slate-200 text-slate-400"
              disabled={vm.page === 0}
              onClick={() => vm.setPage((value) => Math.max(0, value - 1))}
            >
              <ChevronLeft className="size-3" />
            </Button>
            {Array.from({ length: vm.totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => vm.setPage(i)}
                className={cn(
                  'grid size-7 place-items-center rounded-md text-xs font-bold',
                  i === vm.page
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {i + 1}
              </button>
            ))}
            <Button
              variant="outline"
              size="icon-xs"
              className="border-slate-200 text-slate-400"
              disabled={vm.page >= vm.totalPages - 1}
              onClick={() =>
                vm.setPage((value) => Math.min(vm.totalPages - 1, value + 1))
              }
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        ) : null}
      </section>

      <CustomerVisitDetailDialog
        visit={detailTarget}
        vetMap={vm.vetMap}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        onReschedule={(visit) => setRescheduleTarget(visit)}
        onCancel={(visit) => setCancelTarget(visit)}
        onRate={(visit) => setRateTarget(visit)}
        ratingState={
          detailTarget?.vetId !== undefined
            ? (vm.ratingStates.get(detailTarget.vetId) ?? 'checking')
            : 'unavailable'
        }
      />

      <RateVetDialog
        vetId={rateTarget?.vetId ?? null}
        vetLabel={
          rateTarget?.vetId !== undefined
            ? (vm.vetMap.get(rateTarget.vetId)?.fullName ?? `bác sĩ #${rateTarget.vetId}`)
            : undefined
        }
        onOpenChange={(open) => !open && setRateTarget(null)}
      />

      <RescheduleDialog
        visit={rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        onCancelOldVisit={(visit) => setCancelTarget(visit)}
      />

      <AdvancedFilterDialog
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        statusFilter={vm.statusFilter}
        setStatusFilter={vm.setStatusFilter}
        monthFilter={vm.monthFilter}
        setMonthFilter={vm.setMonthFilter}
        vetFilter={vm.vetFilter}
        setVetFilter={vm.setVetFilter}
        vetOptions={vm.vetOptions}
        feeFilter={vm.feeFilter}
        setFeeFilter={vm.setFeeFilter}
        onReset={vm.resetFilters}
      />

      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ lịch khám?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn chắc chắn muốn huỷ lịch khám #{cancelTarget?.id} vào lúc{' '}
              {cancelTarget?.scheduledAt
                ? fullDateFmt.format(new Date(cancelTarget.scheduledAt))
                : '-'}
              ? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelTarget?.id &&
                vm.cancelMutation.mutate(
                  { id: cancelTarget.id },
                  { onSuccess: () => setCancelTarget(null) },
                )
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {vm.cancelMutation.isPending ? 'Đang huỷ...' : 'Xác nhận huỷ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
