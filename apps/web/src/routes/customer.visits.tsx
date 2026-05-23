import { useMemo, useState } from 'react';
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
  Edit3,
  HeartPulse,
  ListFilter,
  MapPin,
  MoreVertical,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

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
  useCancelVisit,
  useSearchVisits,
} from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import {
  SearchVisitsStatus,
  type SearchVisitsParams,
} from '@/lib/api/generated/model';
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

function CustomerVisitsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SearchVisitsStatus | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [cancelTarget, setCancelTarget] = useState<VisitResponse | null>(null);

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
    if (!keyword) return visits;

    return visits.filter((visit) => {
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
  }, [search, visits]);

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
          <PawPrint className="absolute -right-4 -top-4 size-24 text-primary/5" />
          <div className="relative flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-amber-100 to-orange-200 text-4xl shadow-md">
              🐶
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950">Charlie</h2>
                <Edit3 className="size-4 text-primary" />
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
        />
        <MetricCard
          icon={HeartPulse}
          label="Đã khám"
          value={counts.completed}
          caption="Lượt khám"
          action="Xem lịch sử"
          color="emerald"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Đang xử lý"
          value={counts.inProgress}
          caption="Đang khám"
          action="Theo dõi"
          color="orange"
        />
        <MetricCard
          icon={Bell}
          label="Đã huỷ"
          value={counts.cancelled}
          caption="Nhắc nhở"
          action="Xem chi tiết"
          color="rose"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm lịch khám..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as SearchVisitsStatus | typeof ALL)
              }
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

            <Select value="month">
              <SelectTrigger className="h-10 w-[140px] border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Tháng này</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'desc' | 'asc')}>
              <SelectTrigger className="h-10 w-[130px] border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mới nhất</SelectItem>
                <SelectItem value="asc">Cũ nhất</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="border-slate-200">
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
            filteredVisits.map((visit, index) => (
              <VisitRow
                key={visit.id ?? index}
                visit={visit}
                index={index}
                onCancel={() => setCancelTarget(visit)}
              />
            ))
          )}
        </div>

        {filteredVisits.length > 0 ? (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 py-3">
            <Button variant="outline" size="icon-xs" className="border-slate-200 text-slate-400">
              <ChevronLeft className="size-3" />
            </Button>
            <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-white shadow-sm">
              1
            </span>
            <span className="grid size-7 place-items-center rounded-md text-xs font-semibold text-slate-500">
              2
            </span>
            <Button variant="outline" size="icon-xs" className="border-slate-200 text-slate-400">
              <ChevronRight className="size-3" />
            </Button>
          </div>
        ) : null}
      </section>

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
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption: string;
  action: string;
  color: 'violet' | 'emerald' | 'orange' | 'rose';
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
          <div className="mt-1 text-3xl font-extrabold leading-none text-slate-950">
            {value}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{caption}</p>
          <button type="button" className={cn('mt-3 text-xs font-bold', styles.text)}>
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
  onCancel,
}: {
  visit: VisitResponse;
  index: number;
  onCancel: () => void;
}) {
  const date = visit.scheduledAt ? new Date(visit.scheduledAt) : null;
  const status = visit.status ?? VisitResponseStatus.SCHEDULED;
  const canCancel =
    status === VisitResponseStatus.SCHEDULED ||
    status === VisitResponseStatus.IN_PROGRESS;
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
            >
              Xem chi tiết
            </Button>
            {canCancel ? (
              <Button size="sm" className="px-5 text-xs font-bold" onClick={onCancel}>
                Đổi lịch
              </Button>
            ) : null}
            <Button variant="ghost" size="icon-sm" className="text-slate-500">
              <MoreVertical className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
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
