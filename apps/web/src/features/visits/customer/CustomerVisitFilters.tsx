import { ListFilter, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchVisitsStatus } from '@/lib/api/generated/model';
import { ALL, type MonthFilter, type StatusFilter } from './utils';

export function CustomerVisitFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  monthFilter,
  setMonthFilter,
  sortOrder,
  setSortOrder,
  onOpenAdvanced,
}: {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  monthFilter: MonthFilter;
  setMonthFilter: (value: MonthFilter) => void;
  sortOrder: 'desc' | 'asc';
  setSortOrder: (value: 'desc' | 'asc') => void;
  onOpenAdvanced: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm kiếm lịch khám..."
          className="h-10 w-full rounded-md border border-slate-200 bg-white pr-3 pl-9 text-sm transition outline-none focus:border-primary focus:ring-3 focus:ring-primary/15"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-10 w-[170px] border-slate-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
            <SelectItem value={SearchVisitsStatus.SCHEDULED}>Sắp tới</SelectItem>
            <SelectItem value={SearchVisitsStatus.IN_PROGRESS}>Đang khám</SelectItem>
            <SelectItem value={SearchVisitsStatus.COMPLETED}>Đã hoàn thành</SelectItem>
            <SelectItem value={SearchVisitsStatus.CANCELLED}>Đã huỷ</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={monthFilter}
          onValueChange={(v) => setMonthFilter(v as MonthFilter)}
        >
          <SelectTrigger className="h-10 w-[140px] border-slate-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tháng</SelectItem>
            <SelectItem value="current">Tháng này</SelectItem>
            <SelectItem value="next">Tháng tới</SelectItem>
            <SelectItem value="past">Đã qua</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortOrder}
          onValueChange={(v) => setSortOrder(v as 'desc' | 'asc')}
        >
          <SelectTrigger className="h-10 w-[130px] border-slate-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Mới nhất</SelectItem>
            <SelectItem value="asc">Cũ nhất</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="border-slate-200"
          onClick={onOpenAdvanced}
          title="Lọc nâng cao"
        >
          <ListFilter className="size-4" />
        </Button>
      </div>
    </div>
  );
}
