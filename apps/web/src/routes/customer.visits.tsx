import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  HeartPulse,
  ListFilter,
  MapPin,
  MoreVertical,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

import { RateVetDialog } from '@/features/vets/components/RateVetDialog';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCancelVisit, useSearchVisits } from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { SearchVisitsStatus, type SearchVisitsParams } from '@/lib/api/generated/model';
import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/customer/visits')({
  component: CustomerVisitsPage,
});

const ALL = 'ALL' as const;

const fullDateFmt = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const doctorNames = [
  'Bác sĩ Mai Phạm',
  'Bác sĩ Hùng Vũ',
  'Bác sĩ Quân Lê',
  'Bác sĩ Hương Trần',
  'Bác sĩ Minh Anh',
];

const specialties = ['Thú y tổng quát', 'Nội khoa', 'Da liễu', 'Tiêm phòng'];
const PAGE_SIZE = 4;

type MonthFilter = 'all' | 'current' | 'next' | 'past';

function CustomerVisitsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SearchVisitsStatus | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>(ALL);
  const [feeFilter, setFeeFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [page, setPage] = useState(0);
  const [detailTarget, setDetailTarget] = useState<VisitResponse | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<VisitResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<VisitResponse | null>(null);
  const [rateTarget, setRateTarget] = useState<VisitResponse | null>(null);

  const params: SearchVisitsParams = {
    pageable: { page: 0, size: 50, sort: [`scheduledAt,${sortOrder}`] },
    ...(statusFilter !== ALL ? { status: statusFilter } : {}),
  };

  const listQuery = useSearchVisits(params);

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
        setCancelTarget(null);
      },
      onError: (err: Error) => toast.error(err.message || 'Huỷ thất bại'),
    },
  });

  const visits = useMemo(() => listQuery.data?.content ?? [], [listQuery.data?.content]);
  const filteredVisits = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return visits.filter((visit, index) => {
      if (!matchesMonthFilter(visit, monthFilter)) return false;
      if (
        doctorFilter !== ALL &&
        doctorNames[index % doctorNames.length] !== doctorFilter
      ) {
        return false;
      }
      if (feeFilter === 'paid' && !hasVisitFee(visit)) return false;
      if (feeFilter === 'unpaid' && hasVisitFee(visit)) return false;
      if (!keyword) return true;

      const text = [
        visit.reason,
        visit.diagnosis,
        visit.treatment,
        visit.petId ? `pet ${visit.petId}` : '',
        visit.vetId ? `bs ${visit.vetId}` : '',
        visit.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(keyword);
    });
  }, [doctorFilter, feeFilter, monthFilter, search, visits]);

  useEffect(() => {
    setPage(0);
  }, [doctorFilter, feeFilter, monthFilter, search, sortOrder, statusFilter]);

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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Lịch khám của bé <span className="text-primary">Charlie</span>
            </h1>
            <PawPrint className="size-5 text-primary/60" />
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Theo dõi lịch hẹn, kết quả khám và trạng thái chăm sóc thú cưng của bạn.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-white via-violet-50 to-violet-100/70 p-4 shadow-[0_14px_40px_rgba(104,93,199,0.12)]">
          <PawPrint className="absolute -top-4 -right-4 size-24 text-primary/5" />
          <div className="relative flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-amber-100 to-orange-200 text-4xl shadow-md">
              🐶
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950">Charlie</h2>
                <Button
                  asChild
                  variant="ghost"
                  size="icon-xs"
                  className="text-primary hover:bg-primary/10"
                  title="Chỉnh sửa hồ sơ thú cưng"
                >
                  <Link to="/customer/pets">
                    <Edit3 className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <PetPill icon={PawPrint} label="Chó" />
                <PetPill icon={UserRound} label="Đực" />
                <PetPill label="5 tuổi" />
                <PetPill icon={CheckCircle2} label="Đã tiêm vaccine" tone="green" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CalendarCheck}
          label="Lịch sắp tới"
          value={counts.scheduled}
          caption="Cuộc hẹn"
          action="Xem chi tiết"
          color="violet"
          onClick={() => setStatusFilter(SearchVisitsStatus.SCHEDULED)}
        />
        <MetricCard
          icon={HeartPulse}
          label="Đã khám"
          value={counts.completed}
          caption="Lượt khám"
          action="Xem lịch sử"
          color="emerald"
          onClick={() => setStatusFilter(SearchVisitsStatus.COMPLETED)}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Đang xử lý"
          value={counts.inProgress}
          caption="Đang khám"
          action="Theo dõi"
          color="orange"
          onClick={() => setStatusFilter(SearchVisitsStatus.IN_PROGRESS)}
        />
        <MetricCard
          icon={Bell}
          label="Đã huỷ"
          value={counts.cancelled}
          caption="Nhắc nhở"
          action="Xem chi tiết"
          color="rose"
          onClick={() => setStatusFilter(SearchVisitsStatus.CANCELLED)}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
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
              onValueChange={(v) => setStatusFilter(v as SearchVisitsStatus | typeof ALL)}
            >
              <SelectTrigger className="h-10 w-[170px] border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                <SelectItem value={SearchVisitsStatus.SCHEDULED}>Sắp tới</SelectItem>
                <SelectItem value={SearchVisitsStatus.IN_PROGRESS}>Đang khám</SelectItem>
                <SelectItem value={SearchVisitsStatus.COMPLETED}>
                  Đã hoàn thành
                </SelectItem>
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
              onClick={() => setAdvancedOpen(true)}
              title="Lọc nâng cao"
            >
              <ListFilter className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1 p-3">
          {listQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-lg" />
            ))
          ) : filteredVisits.length === 0 ? (
            <EmptyState />
          ) : (
            visibleVisits.map((visit, index) => (
              <VisitRow
                key={visit.id ?? index}
                visit={visit}
                index={currentPage * PAGE_SIZE + index}
                onDetail={() => setDetailTarget(visit)}
                onReschedule={() => setRescheduleTarget(visit)}
                onCancel={() => setCancelTarget(visit)}
                onRate={() => setRateTarget(visit)}
              />
            ))
          )}
        </div>

        {filteredVisits.length > 0 ? (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 py-3">
            <Button
              variant="outline"
              size="icon-xs"
              className="border-slate-200 text-slate-400"
              disabled={currentPage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              <ChevronLeft className="size-3" />
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={cn(
                  'grid size-7 place-items-center rounded-md text-xs font-bold',
                  i === currentPage
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
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
        ) : null}
      </section>

      <VisitDetailDialog
        visit={detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        onReschedule={(visit) => setRescheduleTarget(visit)}
        onCancel={(visit) => setCancelTarget(visit)}
        onRate={(visit) => setRateTarget(visit)}
      />

      <RateVetDialog
        vetId={rateTarget?.vetId ?? null}
        vetLabel={
          rateTarget?.vetId !== undefined ? `bác sĩ #${rateTarget.vetId}` : undefined
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
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        doctorFilter={doctorFilter}
        setDoctorFilter={setDoctorFilter}
        feeFilter={feeFilter}
        setFeeFilter={setFeeFilter}
        onReset={() => {
          setStatusFilter(ALL);
          setMonthFilter('all');
          setDoctorFilter(ALL);
          setFeeFilter('all');
          setSearch('');
        }}
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
                cancelTarget?.id && cancelMutation.mutate({ id: cancelTarget.id })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? 'Đang huỷ...' : 'Xác nhận huỷ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  action,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption: string;
  action: string;
  color: 'violet' | 'emerald' | 'orange' | 'rose';
  onClick: () => void;
}) {
  const styles = {
    violet: {
      gradient: 'from-violet-50',
      text: 'text-violet-600',
      bg: 'bg-violet-100',
    },
    emerald: {
      gradient: 'from-emerald-50',
      text: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    orange: {
      gradient: 'from-orange-50',
      text: 'text-orange-500',
      bg: 'bg-orange-100',
    },
    rose: {
      gradient: 'from-rose-50',
      text: 'text-rose-500',
      bg: 'bg-rose-100',
    },
  }[color];

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-gradient-to-br p-5 shadow-[0_12px_34px_rgba(15,23,42,0.04)]',
        styles.gradient,
        'to-white',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-lg',
            styles.bg,
            styles.text,
          )}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-1 text-3xl leading-none font-extrabold text-slate-950">
            {value}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{caption}</p>
          <button
            type="button"
            onClick={onClick}
            className={cn('mt-3 text-xs font-bold hover:underline', styles.text)}
          >
            {action} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitRow({
  visit,
  index,
  onDetail,
  onReschedule,
  onCancel,
  onRate,
}: {
  visit: VisitResponse;
  index: number;
  onDetail: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onRate: () => void;
}) {
  const date = visit.scheduledAt ? new Date(visit.scheduledAt) : null;
  const status = visit.status ?? VisitResponseStatus.SCHEDULED;
  const canCancel =
    status === VisitResponseStatus.SCHEDULED ||
    status === VisitResponseStatus.IN_PROGRESS;
  const canRate = status === VisitResponseStatus.COMPLETED && visit.vetId !== undefined;
  const title = titleForVisit(visit);
  const doctor = doctorNames[index % doctorNames.length];
  const specialty = specialties[index % specialties.length];

  return (
    <div className="grid gap-3 lg:grid-cols-[78px_1fr] lg:items-stretch">
      <div className="hidden items-start gap-3 pt-3 lg:flex">
        <span className={cn('mt-2 size-3 rounded-full', timelineDot(status))} />
        <div className="leading-tight">
          <div className="text-2xl font-extrabold text-slate-900">
            {date ? date.toLocaleDateString('vi-VN', { day: '2-digit' }) : '--'}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {date ? `Th${date.getMonth() + 1}, ${date.getFullYear()}` : 'Chưa rõ'}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {date ? timeFmt.format(date) : '--:--'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] transition hover:border-primary/40 hover:shadow-[0_14px_34px_rgba(104,93,199,0.10)] md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-amber-100 to-orange-200 text-3xl shadow-sm">
            🐶
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-slate-950">{title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3.5" />
                {doctor}
              </span>
              <span>{specialty}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
              <MapPin className="size-3.5" />
              PetCare Clinic - Cầu Giấy
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[170px_110px_auto] md:items-center">
          <div className="space-y-1 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-slate-400" />
              <span>{date ? fullDateFmt.format(date) : 'Chưa có lịch'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-slate-400" />
              <span>{timeRange(date)}</span>
            </div>
          </div>

          <StatusPill status={status} />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 px-4 text-xs font-bold text-primary hover:bg-primary/10"
              onClick={onDetail}
            >
              Xem chi tiết
            </Button>
            {canCancel ? (
              <Button size="sm" className="px-5 text-xs font-bold" onClick={onReschedule}>
                Đổi lịch
              </Button>
            ) : null}
            {canRate ? (
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-400 px-3 text-xs font-bold text-yellow-700 hover:bg-yellow-50"
                onClick={onRate}
              >
                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                Đánh giá
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-slate-500">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onDetail}>
                  <CalendarCheck className="size-4" />
                  Xem hồ sơ khám
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReschedule} disabled={!canCancel}>
                  <Calendar className="size-4" />
                  Đổi lịch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRate} disabled={!canRate}>
                  <Star className="size-4" />
                  Đánh giá bác sĩ
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void navigator.clipboard?.writeText(`#${visit.id ?? ''}`);
                    toast.success('Đã sao chép mã lịch');
                  }}
                >
                  <Copy className="size-4" />
                  Sao chép mã
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onCancel}
                  disabled={!canCancel}
                >
                  <Trash2 className="size-4" />
                  Huỷ lịch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitDetailDialog({
  visit,
  onOpenChange,
  onReschedule,
  onCancel,
  onRate,
}: {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
  onReschedule: (visit: VisitResponse) => void;
  onCancel: (visit: VisitResponse) => void;
  onRate: (visit: VisitResponse) => void;
}) {
  const date = visit?.scheduledAt ? new Date(visit.scheduledAt) : null;
  const status = visit?.status ?? VisitResponseStatus.SCHEDULED;
  const canCancel =
    status === VisitResponseStatus.SCHEDULED ||
    status === VisitResponseStatus.IN_PROGRESS;
  const canRate = status === VisitResponseStatus.COMPLETED && visit?.vetId !== undefined;

  return (
    <Dialog open={visit !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl p-0">
        <DialogHeader className="border-b border-slate-100 p-6">
          <DialogTitle className="text-2xl font-extrabold text-slate-950">
            Chi tiết lịch khám #{visit?.id}
          </DialogTitle>
          <DialogDescription>
            Thông tin lịch hẹn, bác sĩ phụ trách và kết quả khám.
          </DialogDescription>
        </DialogHeader>

        {visit ? (
          <div className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-4 rounded-xl bg-violet-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-14 place-items-center rounded-full bg-white text-3xl shadow-sm">
                  🐶
                </div>
                <div>
                  <p className="text-lg font-extrabold text-slate-950">
                    {titleForVisit(visit)}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    Charlie • Pet #{visit.petId ?? '-'}
                  </p>
                </div>
              </div>
              <StatusPill status={status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={Calendar}
                label="Ngày khám"
                value={date ? fullDateFmt.format(date) : '-'}
              />
              <InfoTile icon={Clock3} label="Giờ khám" value={timeRange(date)} />
              <InfoTile
                icon={UserRound}
                label="Bác sĩ"
                value={`BS #${visit.vetId ?? '-'}`}
              />
              <InfoTile
                icon={MapPin}
                label="Chi nhánh"
                value="PetCare Clinic - Cầu Giấy"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ResultBlock label="Lý do khám" value={visit.reason || 'Chưa cập nhật'} />
              <ResultBlock label="Chẩn đoán" value={visit.diagnosis || 'Chưa cập nhật'} />
              <ResultBlock label="Điều trị" value={visit.treatment || 'Chưa cập nhật'} />
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Phí khám
              </p>
              <p className="mt-1 text-2xl font-extrabold text-primary">
                {formatVisitFee(visit)}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t border-slate-100 p-6">
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
          {visit && canCancel ? (
            <>
              <Button variant="outline" onClick={() => onCancel(visit)}>
                Huỷ lịch
              </Button>
              <Button onClick={() => onReschedule(visit)}>Đổi lịch</Button>
            </>
          ) : null}
          {visit && canRate ? (
            <Button
              className="bg-yellow-500 text-white hover:bg-yellow-600"
              onClick={() => onRate(visit)}
            >
              <Star className="size-4 fill-white text-white" />
              Đánh giá bác sĩ
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  visit,
  onOpenChange,
  onCancelOldVisit,
}: {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
  onCancelOldVisit: (visit: VisitResponse) => void;
}) {
  const date = visit?.scheduledAt ? new Date(visit.scheduledAt) : null;

  return (
    <Dialog open={visit !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-slate-950">
            Đổi lịch khám
          </DialogTitle>
          <DialogDescription>
            Hệ thống hiện hỗ trợ đặt lịch mới và huỷ lịch cũ để hoàn tất đổi lịch.
          </DialogDescription>
        </DialogHeader>

        {visit ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Lịch hiện tại
              </p>
              <p className="mt-2 font-extrabold text-slate-950">{titleForVisit(visit)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {date ? fullDateFmt.format(date) : '-'} • {timeRange(date)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={Calendar}
                label="Bước 1"
                value="Đặt lịch mới ở form đặt lịch"
              />
              <InfoTile
                icon={Trash2}
                label="Bước 2"
                value="Huỷ lịch cũ sau khi xác nhận"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Để sau</Button>
          </DialogClose>
          {visit ? (
            <Button variant="outline" onClick={() => onCancelOldVisit(visit)}>
              Huỷ lịch cũ
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/customer/book">Đặt lịch mới</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdvancedFilterDialog({
  open,
  onOpenChange,
  statusFilter,
  setStatusFilter,
  monthFilter,
  setMonthFilter,
  doctorFilter,
  setDoctorFilter,
  feeFilter,
  setFeeFilter,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusFilter: SearchVisitsStatus | typeof ALL;
  setStatusFilter: (value: SearchVisitsStatus | typeof ALL) => void;
  monthFilter: MonthFilter;
  setMonthFilter: (value: MonthFilter) => void;
  doctorFilter: string;
  setDoctorFilter: (value: string) => void;
  feeFilter: 'all' | 'paid' | 'unpaid';
  setFeeFilter: (value: 'all' | 'paid' | 'unpaid') => void;
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
              onValueChange={(v) => setStatusFilter(v as SearchVisitsStatus | typeof ALL)}
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
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả bác sĩ</SelectItem>
                {doctorNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Thanh toán">
            <Select
              value={feeFilter}
              onValueChange={(v) => setFeeFilter(v as 'all' | 'paid' | 'unpaid')}
            >
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

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ResultBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-xl bg-violet-50 text-primary">
        <CalendarCheck className="size-8" />
      </div>
      <div>
        <p className="font-bold text-slate-950">Chưa có lịch khám nào</p>
        <p className="text-sm text-slate-500">
          Hãy đặt lịch đầu tiên cho thú cưng của bạn.
        </p>
      </div>
      <Button asChild>
        <Link to="/customer/book">
          <Plus className="size-4" /> Đặt lịch khám mới
        </Link>
      </Button>
    </div>
  );
}

function PetPill({
  icon: Icon,
  label,
  tone = 'slate',
}: {
  icon?: typeof PawPrint;
  label: string;
  tone?: 'slate' | 'green';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        tone === 'green'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-white/80 text-slate-700',
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: VisitResponseStatus }) {
  const styles: Record<VisitResponseStatus, string> = {
    SCHEDULED: 'bg-violet-50 text-violet-700',
    IN_PROGRESS: 'bg-orange-50 text-orange-600',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-50 text-rose-600',
  };

  const labels: Record<VisitResponseStatus, string> = {
    SCHEDULED: 'Sắp tới',
    IN_PROGRESS: 'Đang chờ',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã huỷ',
  };

  return (
    <span
      className={cn(
        'justify-self-start rounded-full px-3 py-1.5 text-xs font-extrabold md:justify-self-center',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function titleForVisit(visit: VisitResponse) {
  if (visit.reason) return visit.reason;
  if (visit.status === VisitResponseStatus.COMPLETED) return 'Tiêm phòng 5 bệnh';
  if (visit.status === VisitResponseStatus.CANCELLED) return 'Khám da liễu';
  if (visit.status === VisitResponseStatus.IN_PROGRESS) return 'Tái khám sau điều trị';
  return 'Khám tổng quát định kỳ';
}

function hasVisitFee(visit: VisitResponse) {
  return typeof visit.fee === 'number' && Number.isFinite(visit.fee);
}

function formatVisitFee(visit: VisitResponse) {
  if (!hasVisitFee(visit)) return 'Chưa phát sinh';

  return visit.fee!.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
  });
}

function matchesMonthFilter(visit: VisitResponse, filter: MonthFilter) {
  if (filter === 'all') return true;
  if (!visit.scheduledAt) return false;

  const date = new Date(visit.scheduledAt);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (filter === 'current') {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }

  if (filter === 'next') {
    const next = new Date(currentYear, currentMonth + 1, 1);
    return (
      date.getMonth() === next.getMonth() && date.getFullYear() === next.getFullYear()
    );
  }

  return date.getTime() < now.getTime();
}

function timelineDot(status: VisitResponseStatus) {
  const styles: Record<VisitResponseStatus, string> = {
    SCHEDULED: 'bg-violet-500',
    IN_PROGRESS: 'bg-orange-400',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-rose-500',
  };

  return styles[status];
}

function timeRange(date: Date | null) {
  if (!date) return '--:-- - --:--';
  const end = new Date(date);
  end.setMinutes(end.getMinutes() + 30);
  return `${timeFmt.format(date)} - ${timeFmt.format(end)}`;
}
