import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FilePenLine,
  PawPrint,
  Plus,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store';
import { useGetMyOwnerProfile } from '@/lib/api/generated/owners/owners';
import type { VisitResponse } from '@/lib/api/generated/model';
import { SearchVisitsStatus } from '@/lib/api/generated/model';
import { useSearchVisits } from '@/lib/api/generated/visits/visits';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/customer/')({
  component: CustomerDashboard,
});

const datePartsFmt = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: 'long',
});

const dateShortFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'numeric',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
});

const petPhotos = [
  'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=160&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=160&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=160&q=80&auto=format&fit=crop',
];

function CustomerDashboard() {
  const user = useAuthStore((s) => s.user);

  const upcomingQuery = useSearchVisits({
    pageable: { page: 0, size: 5, sort: ['scheduledAt,asc'] },
    status: SearchVisitsStatus.SCHEDULED,
  });
  const recentQuery = useSearchVisits({
    pageable: { page: 0, size: 5, sort: ['scheduledAt,desc'] },
  });
  const ownerQuery = useGetMyOwnerProfile();

  const upcoming = upcomingQuery.data?.content ?? [];
  const recent = recentQuery.data?.content ?? [];
  const pets = ownerQuery.data?.pets ?? [];

  const petNameById = new Map(pets.map((pet) => [pet.id, pet.name ?? `Pet #${pet.id}`]));
  const firstUpcoming = upcoming[0];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-6 py-7 shadow-[0_16px_50px_rgba(124,108,245,0.10)]">
        <div className="relative z-10 flex max-w-3xl items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-sm">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Xin chào, {user?.username ?? 'customer@petclinic.local'} 👋
            </h1>
            <p className="mt-2 text-sm leading-6 font-medium text-slate-500">
              Theo dõi lịch khám, hồ sơ thú cưng và đặt lịch mới - tất cả ở một nơi.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute top-1/2 right-8 hidden -translate-y-1/2 items-center gap-3 lg:flex">
          <div className="flex size-24 items-center justify-center rounded-full bg-white/80 text-violet-500 shadow-sm">
            <PawPrint className="size-11" />
          </div>
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-sm">
            <CalendarCheck className="size-8" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          icon={CalendarCheck}
          label="Lịch sắp tới"
          value={upcomingQuery.data?.totalElements ?? 0}
          subLabel="Cuộc hẹn"
          action="Xem chi tiết"
          to="/customer/visits"
          loading={upcomingQuery.isLoading}
          className="from-blue-500 to-indigo-500"
        />
        <StatCard
          icon={Stethoscope}
          label="Lượt khám đã thực hiện"
          value={recentQuery.data?.totalElements ?? 0}
          subLabel="Lượt khám"
          action="Xem lịch sử"
          to="/customer/visits"
          loading={recentQuery.isLoading}
          className="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={PawPrint}
          label="Thú cưng"
          value={pets.length}
          subLabel="Bé cưng"
          action="Quản lý thú cưng"
          to="/customer/pets"
          loading={ownerQuery.isLoading}
          className="from-violet-500 to-fuchsia-500"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.02fr_0.98fr]">
        <DashboardPanel
          icon={CalendarCheck}
          title="Lịch khám sắp tới"
          actionTo="/customer/visits"
        >
          {upcomingQuery.isLoading ? (
            <ListSkeleton />
          ) : firstUpcoming ? (
            <>
              <VisitPreview visit={firstUpcoming} petNameById={petNameById} />
              <Link
                to="/customer/book"
                className="flex items-center gap-4 rounded-2xl border border-dashed border-violet-300 bg-violet-50/40 p-4 text-violet-700 transition hover:bg-violet-50"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl border border-violet-200 bg-white shadow-sm">
                  <Plus className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Đặt lịch khám mới</span>
                  <span className="text-xs font-medium text-slate-500">
                    Chọn bác sĩ, thời gian phù hợp cho thú cưng của bạn
                  </span>
                </span>
              </Link>
            </>
          ) : (
            <EmptySchedule />
          )}
        </DashboardPanel>

        <DashboardPanel
          icon={Clock3}
          title="Hoạt động gần đây"
          actionTo="/customer/visits"
        >
          {recentQuery.isLoading ? (
            <ListSkeleton />
          ) : recent.length > 0 ? (
            <>
              <VisitMini visit={recent[0]!} petNameById={petNameById} />
              <div className="divide-y divide-slate-100">
                {recent.slice(0, 3).map((visit, index) => (
                  <ActivityItem
                    key={visit.id ?? index}
                    visit={visit}
                    petName={petNameById.get(visit.petId) ?? `Pet #${visit.petId ?? '-'}`}
                    index={index}
                  />
                ))}
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full text-violet-600"
              >
                <Link to="/customer/visits">Xem tất cả hoạt động</Link>
              </Button>
            </>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-medium text-slate-500">
              Chưa có hoạt động nào.
            </p>
          )}
        </DashboardPanel>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-r from-violet-100 via-violet-50 to-indigo-50 px-6 py-7 shadow-[0_16px_50px_rgba(124,108,245,0.12)]">
        <div className="relative z-10 flex items-start gap-5 lg:pr-80">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-300">
            <CalendarCheck className="size-8" />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Đặt lịch khám dễ dàng</h2>
              <p className="mt-1 max-w-md text-sm leading-6 font-medium text-slate-600">
                Chọn bác sĩ, thời gian phù hợp và đặt lịch cho thú cưng chỉ trong vài bước
                đơn giản.
              </p>
            </div>
            <Button
              asChild
              className="w-fit rounded-xl bg-violet-600 px-5 shadow-lg shadow-violet-300 hover:bg-violet-700"
            >
              <Link to="/customer/book">
                <Plus className="size-4" /> Đặt lịch khám mới
              </Link>
            </Button>
          </div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=520&q=80&auto=format&fit=crop"
          alt=""
          className="pointer-events-none absolute right-14 bottom-0 hidden h-32 w-72 rounded-t-[36px] object-cover object-top opacity-80 mix-blend-multiply lg:block"
        />
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  action,
  to,
  loading,
  className,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: number;
  subLabel: string;
  action: string;
  to: '/customer/visits' | '/customer/pets';
  loading?: boolean;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-5">
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg',
            className,
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-14" />
          ) : (
            <p className="mt-1 text-3xl leading-none font-black text-slate-950">
              {value}
            </p>
          )}
          <p className="mt-2 text-sm font-medium text-slate-500">{subLabel}</p>
        </div>
      </div>
      <Link
        to={to}
        className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700"
      >
        {action} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function DashboardPanel({
  icon: Icon,
  title,
  actionTo,
  children,
}: {
  icon: typeof CalendarCheck;
  title: string;
  actionTo: '/customer/visits';
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-violet-600" />
          <h2 className="font-black text-slate-950">{title}</h2>
        </div>
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700"
        >
          Xem tất cả <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function VisitPreview({
  visit,
  petNameById,
}: {
  visit: VisitResponse;
  petNameById: Map<number | undefined, string>;
}) {
  const date = visit.scheduledAt ? new Date(visit.scheduledAt) : undefined;
  const parts = getDateParts(date);
  const petName = petNameById.get(visit.petId) ?? `Pet #${visit.petId ?? '-'}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[78px_1fr_auto] sm:items-center">
        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
          <p className="text-xs font-bold text-slate-400">{parts.weekday}</p>
          <p className="text-3xl leading-tight font-black text-slate-900">{parts.day}</p>
          <p className="text-xs font-bold text-slate-500">{parts.month}</p>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-lg font-black text-slate-950">
              {date ? timeFmt.format(date) : '--:--'}
            </p>
            <img
              src={petPhotos[0]}
              alt=""
              className="size-12 rounded-full border-2 border-white object-cover shadow-md"
            />
            <div>
              <p className="font-black text-slate-950">{petName}</p>
              <p className="text-xs font-semibold text-slate-500">
                {date ? dateShortFmt.format(date) : 'Chưa có ngày'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&q=80&auto=format&fit=crop"
              alt=""
              className="size-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-bold text-slate-800">BS. Mai Phạm</p>
              <p className="text-xs font-medium text-slate-500">
                {visit.reason || 'Khám tổng quát'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 sm:items-end">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
            Đã đặt
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100"
          >
            <Link to="/customer/visits">Xem chi tiết</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function VisitMini({
  visit,
  petNameById,
}: {
  visit: VisitResponse;
  petNameById: Map<number | undefined, string>;
}) {
  const date = visit.scheduledAt ? new Date(visit.scheduledAt) : undefined;
  const parts = getDateParts(date);
  const petName = petNameById.get(visit.petId) ?? `Pet #${visit.petId ?? '-'}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
        <div className="rounded-xl bg-white px-2 py-2 text-center shadow-sm">
          <p className="text-[11px] font-bold text-slate-400">{parts.weekday}</p>
          <p className="text-2xl leading-tight font-black text-slate-900">{parts.day}</p>
          <p className="text-[11px] font-bold text-slate-500">{parts.month}</p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div>
            <p className="text-lg font-black text-slate-950">
              {date ? timeFmt.format(date) : '--:--'}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {date ? dateShortFmt.format(date) : '-'}
            </p>
          </div>
          <img
            src={petPhotos[1]}
            alt=""
            className="size-12 rounded-full border-2 border-white object-cover shadow-sm"
          />
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{petName}</p>
            <p className="truncate text-xs font-medium text-slate-500">
              {visit.reason || 'Khám tổng quát'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
          Đã đặt
        </span>
      </div>
    </div>
  );
}

function ActivityItem({
  visit,
  petName,
  index,
}: {
  visit: VisitResponse;
  petName: string;
  index: number;
}) {
  const date = visit.scheduledAt ? new Date(visit.scheduledAt) : undefined;
  const Icon = index === 1 ? FilePenLine : index === 2 ? CalendarCheck : CheckCircle2;
  const color =
    index === 1
      ? 'text-violet-600 bg-violet-50'
      : index === 2
        ? 'text-blue-600 bg-blue-50'
        : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            color,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">
            {index === 1 ? 'Cập nhật hồ sơ thú cưng' : 'Đặt lịch thành công'}
          </p>
          <p className="truncate text-xs font-medium text-slate-500">
            {petName}
            {visit.reason ? ` - ${visit.reason}` : ''}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-slate-400">
        {date ? `${timeFmt.format(date)} ${dateShortFmt.format(date)}` : '--'}
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </>
  );
}

function EmptySchedule() {
  return (
    <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-8 text-center">
      <CalendarCheck className="mx-auto size-12 text-violet-400" />
      <p className="mt-3 font-black text-slate-900">Chưa có lịch khám</p>
      <p className="mt-1 text-sm font-medium text-slate-500">
        Đặt lịch ngay để được chăm sóc sớm nhất.
      </p>
      <Button asChild className="mt-4 rounded-xl bg-violet-600 hover:bg-violet-700">
        <Link to="/customer/book">Đặt lịch khám mới</Link>
      </Button>
    </div>
  );
}

function getDateParts(date: Date | undefined) {
  if (!date) {
    return { weekday: 'Thứ', day: '--', month: 'Tháng' };
  }

  const parts = datePartsFmt.formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Thứ';
  const day = parts.find((part) => part.type === 'day')?.value ?? '--';
  const monthValue = parts.find((part) => part.type === 'month')?.value ?? '';

  return { weekday, day, month: monthValue ? `Tháng ${monthValue}` : 'Tháng' };
}
