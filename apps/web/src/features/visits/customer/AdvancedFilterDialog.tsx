import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchVisitsStatus } from '@/lib/api/generated/model';

import { FilterField } from './parts';
import {
  ALL,
  type FeeFilter,
  type MonthFilter,
  type StatusFilter,
  type VetFilter,
} from './utils';

interface VetOption {
  id: number;
  label: string;
}

export function AdvancedFilterDialog({
  open,
  onOpenChange,
  statusFilter,
  setStatusFilter,
  monthFilter,
  setMonthFilter,
  vetFilter,
  setVetFilter,
  vetOptions,
  feeFilter,
  setFeeFilter,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  monthFilter: MonthFilter;
  setMonthFilter: (value: MonthFilter) => void;
  vetFilter: VetFilter;
  setVetFilter: (value: VetFilter) => void;
  vetOptions: VetOption[];
  feeFilter: FeeFilter;
  setFeeFilter: (value: FeeFilter) => void;
  onReset: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-slate-950">
            <SlidersHorizontal className="size-5 text-primary" />
            Lọc nâng cao
          </DialogTitle>
          <DialogDescription>
            Thu hẹp lịch khám theo trạng thái, thời gian, bác sĩ và thanh toán.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FilterField label="Trạng thái">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả</SelectItem>
                <SelectItem value={SearchVisitsStatus.SCHEDULED}>Sắp tới</SelectItem>
                <SelectItem value={SearchVisitsStatus.IN_PROGRESS}>Đang khám</SelectItem>
                <SelectItem value={SearchVisitsStatus.COMPLETED}>
                  Đã hoàn thành
                </SelectItem>
                <SelectItem value={SearchVisitsStatus.CANCELLED}>Đã huỷ</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Thời gian">
            <Select
              value={monthFilter}
              onValueChange={(v) => setMonthFilter(v as MonthFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tháng</SelectItem>
                <SelectItem value="current">Tháng này</SelectItem>
                <SelectItem value="next">Tháng tới</SelectItem>
                <SelectItem value="past">Đã qua</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Bác sĩ">
            <Select value={vetFilter} onValueChange={setVetFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả bác sĩ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả bác sĩ</SelectItem>
                {vetOptions.map((vet) => (
                  <SelectItem key={vet.id} value={String(vet.id)}>
                    {vet.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Thanh toán">
            <Select value={feeFilter} onValueChange={(v) => setFeeFilter(v as FeeFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="paid">Đã có phí khám</SelectItem>
                <SelectItem value="unpaid">Chưa phát sinh phí</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReset}>
            Xoá bộ lọc
          </Button>
          <DialogClose asChild>
            <Button>Áp dụng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
