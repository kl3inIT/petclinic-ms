import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarCheck,
  Camera,
  Clock3,
  PawPrint,
  Receipt,
  Stethoscope,
  Users,
  WalletCards,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatVnd } from '@/features/billing/format';
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL } from '@/features/billing/labels';
import { VisitStatusBadge } from '@/features/visits/components/VisitStatusBadge';
import { useInvoices } from '@/features/billing/api';
import { useListOwners } from '@/lib/api/generated/owners/owners';
import { useListPets } from '@/lib/api/generated/pets/pets';
import { useListPendingVetPhotos } from '@/lib/api/generated/vet-reviews/vet-reviews';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { useSearchVisits } from '@/lib/api/generated/visits/visits';
import { SearchVisitsStatus } from '@/lib/api/generated/model';

const countPageable = { page: 0, size: 1 };

export function SystemAdminDashboard() {
  const range = todayRange();
  const visitsQuery = useSearchVisits({
    from: range.from,
    to: range.to,
    pageable: { page: 0, size: 6, sort: ['scheduledAt,asc'] },
  });
  const invoicesQuery = useInvoices({
    status: 'OPEN',
    pageable: { page: 0, size: 5, sort: ['issuedAt,desc'] },
  });
  const ownersQuery = useListOwners({ pageable: countPageable });
  const petsQuery = useListPets({ pageable: countPageable });
  const vetsQuery = useListVets({ pageable: countPageable });
  const pendingPhotosQuery = useListPendingVetPhotos();

  return (
    <DashboardFrame
      eyebrow="ADMIN CONTROL CENTER"
      title="Tổng quan vận hành PetClinic"
      description="Theo dõi hoạt động khám bệnh, khách hàng, thanh toán và các tác vụ cần quản trị viên xử lý."
      tone="admin"
      metrics={[
        {
          label: 'Lịch khám hôm nay',
          value: visitsQuery.data?.totalElements,
          icon: CalendarCheck,
          loading: visitsQuery.isLoading,
          accent: 'text-violet-700 bg-violet-100',
        },
        {
          label: 'Hoá đơn đang mở',
          value: invoicesQuery.data?.totalElements,
          icon: WalletCards,
          loading: invoicesQuery.isLoading,
          accent: 'text-amber-700 bg-amber-100',
        },
        {
          label: 'Chủ nuôi',
          value: ownersQuery.data?.totalElements,
          icon: Users,
          loading: ownersQuery.isLoading,
          accent: 'text-blue-700 bg-blue-100',
        },
        {
          label: 'Thú cưng',
          value: petsQuery.data?.totalElements,
          icon: PawPrint,
          loading: petsQuery.isLoading,
          accent: 'text-emerald-700 bg-emerald-100',
        },
        {
          label: 'Bác sĩ',
          value: vetsQuery.data?.totalElements,
          icon: Stethoscope,
          loading: vetsQuery.isLoading,
          accent: 'text-cyan-700 bg-cyan-100',
        },
        {
          label: 'Ảnh chờ duyệt',
          value: pendingPhotosQuery.data?.length,
          icon: Camera,
          loading: pendingPhotosQuery.isLoading,
          accent: 'text-rose-700 bg-rose-100',
        },
      ]}
    >
      <DashboardColumns
        visits={visitsQuery.data?.content ?? []}
        visitsLoading={visitsQuery.isLoading}
        invoices={invoicesQuery.data?.content ?? []}
        invoicesLoading={invoicesQuery.isLoading}
        visitsHref="/admin/visits"
        invoicesHref="/admin/invoices"
      />

      <QuickActions
        items={[
          {
            to: '/admin/visits',
            label: 'Quản lý lịch khám',
            description: 'Theo dõi toàn bộ lượt khám',
          },
          {
            to: '/admin/vets',
            label: 'Quản lý bác sĩ',
            description: 'Hồ sơ và lịch trực',
          },
          {
            to: '/admin/vet-reviews',
            label: 'Duyệt ảnh bác sĩ',
            description: 'Xử lý ảnh đang chờ duyệt',
          },
          {
            to: '/inventory',
            label: 'Kho và sản phẩm',
            description: 'Mở cổng quản lý kho riêng',
          },
        ]}
      />
    </DashboardFrame>
  );
}

export function StaffDashboard() {
  const range = todayRange();
  const visitsQuery = useSearchVisits({
    from: range.from,
    to: range.to,
    pageable: { page: 0, size: 8, sort: ['scheduledAt,asc'] },
  });
  const scheduledQuery = useSearchVisits({
    from: range.from,
    to: range.to,
    status: SearchVisitsStatus.SCHEDULED,
    pageable: countPageable,
  });
  const invoicesQuery = useInvoices({
    status: 'OPEN',
    pageable: { page: 0, size: 5, sort: ['issuedAt,asc'] },
  });
  const ownersQuery = useListOwners({ pageable: countPageable });

  return (
    <DashboardFrame
      eyebrow="RECEPTION DESK"
      title="Bàn làm việc lễ tân"
      description="Tiếp nhận lịch hẹn, hỗ trợ chủ nuôi và xử lý các hoá đơn chờ thanh toán tại quầy."
      tone="staff"
      metrics={[
        {
          label: 'Lịch hẹn hôm nay',
          value: visitsQuery.data?.totalElements,
          icon: CalendarCheck,
          loading: visitsQuery.isLoading,
          accent: 'text-sky-700 bg-sky-100',
        },
        {
          label: 'Đang chờ tiếp nhận',
          value: scheduledQuery.data?.totalElements,
          icon: Clock3,
          loading: scheduledQuery.isLoading,
          accent: 'text-violet-700 bg-violet-100',
        },
        {
          label: 'Hoá đơn chờ thu',
          value: invoicesQuery.data?.totalElements,
          icon: Receipt,
          loading: invoicesQuery.isLoading,
          accent: 'text-amber-700 bg-amber-100',
        },
        {
          label: 'Chủ nuôi',
          value: ownersQuery.data?.totalElements,
          icon: Users,
          loading: ownersQuery.isLoading,
          accent: 'text-emerald-700 bg-emerald-100',
        },
      ]}
    >
      <DashboardColumns
        visits={visitsQuery.data?.content ?? []}
        visitsLoading={visitsQuery.isLoading}
        invoices={invoicesQuery.data?.content ?? []}
        invoicesLoading={invoicesQuery.isLoading}
        visitsHref="/staff/visits"
        invoicesHref="/staff/invoices"
      />

      <QuickActions
        items={[
          {
            to: '/staff/visits',
            label: 'Tiếp nhận lịch hẹn',
            description: 'Đặt mới, theo dõi hoặc huỷ lịch',
          },
          {
            to: '/staff/owners',
            label: 'Tra cứu chủ nuôi',
            description: 'Thông tin liên hệ và hồ sơ',
          },
          {
            to: '/staff/pets',
            label: 'Tra cứu thú cưng',
            description: 'Xem danh sách thú cưng',
          },
          {
            to: '/staff/invoices',
            label: 'Mở quầy thu ngân',
            description: 'Thêm hàng bán lẻ và thanh toán',
          },
        ]}
      />
    </DashboardFrame>
  );
}

interface Metric {
  label: string;
  value?: number;
  icon: LucideIcon;
  loading: boolean;
  accent: string;
}

function DashboardFrame({
  eyebrow,
  title,
  description,
  tone,
  metrics,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: 'admin' | 'staff';
  metrics: Metric[];
  children: ReactNode;
}) {
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      <section
        className={`overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl md:px-8 ${
          tone === 'admin'
            ? 'bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 shadow-violet-900/15'
            : 'bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-700 shadow-sky-900/15'
        }`}
      >
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.2em] text-white/60">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-white/70">
              {description}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-bold tracking-wider text-white/55 uppercase">
              Hôm nay
            </p>
            <p className="mt-1 text-sm font-bold capitalize">{today}</p>
          </div>
        </div>
      </section>

      <section
        className={`grid gap-4 sm:grid-cols-2 ${metrics.length > 4 ? 'xl:grid-cols-6' : 'xl:grid-cols-4'}`}
      >
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                  {metric.label}
                </p>
                {metric.loading ? (
                  <Skeleton className="mt-2 h-8 w-16" />
                ) : (
                  <p className="mt-1 text-3xl font-black text-slate-950">
                    {metric.value ?? '—'}
                  </p>
                )}
              </div>
              <div
                className={`flex size-11 items-center justify-center rounded-2xl ${metric.accent}`}
              >
                <metric.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {children}
    </div>
  );
}

function DashboardColumns({
  visits,
  visitsLoading,
  invoices,
  invoicesLoading,
  visitsHref,
  invoicesHref,
}: {
  visits: Array<{
    id?: number;
    scheduledAt?: string;
    petName?: string;
    ownerName?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  }>;
  visitsLoading: boolean;
  invoices: Array<{
    id?: number;
    customerName?: string;
    total?: number;
    issuedAt?: string;
    status?: 'OPEN' | 'PAID' | 'CANCELLED';
  }>;
  invoicesLoading: boolean;
  visitsHref: '/admin/visits' | '/staff/visits';
  invoicesHref: '/admin/invoices' | '/staff/invoices';
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold">Lịch khám hôm nay</CardTitle>
          <Link
            to={visitsHref}
            className="flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline"
          >
            Xem tất cả <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {visitsLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          ) : visits.length === 0 ? (
            <EmptyMessage message="Hôm nay chưa có lịch khám." />
          ) : (
            visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"
              >
                <div className="w-14 shrink-0 text-center">
                  <p className="text-sm font-black text-slate-900">
                    {formatTime(visit.scheduledAt)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    #{visit.id}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {visit.petName ?? 'Chưa có tên thú cưng'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {visit.ownerName ?? 'Chưa có thông tin chủ nuôi'}
                  </p>
                </div>
                {visit.status ? <VisitStatusBadge status={visit.status} /> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold">Hoá đơn đang mở</CardTitle>
          <Link
            to={invoicesHref}
            className="flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline"
          >
            Đến quầy <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoicesLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          ) : invoices.length === 0 ? (
            <EmptyMessage message="Không có hoá đơn chờ thanh toán." />
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border border-slate-100 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      #{invoice.id} · {invoice.customerName || 'Khách lẻ'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(invoice.issuedAt)}
                    </p>
                  </div>
                  <Badge className={INVOICE_STATUS_CLASS[invoice.status ?? 'OPEN']}>
                    {INVOICE_STATUS_LABEL[invoice.status ?? 'OPEN']}
                  </Badge>
                </div>
                <p className="mt-2 text-right font-mono text-sm font-black text-slate-950">
                  {formatVnd(invoice.total)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function QuickActions({
  items,
}: {
  items: Array<{
    to:
      | '/admin/visits'
      | '/admin/vets'
      | '/admin/vet-reviews'
      | '/inventory'
      | '/staff/visits'
      | '/staff/owners'
      | '/staff/pets'
      | '/staff/invoices';
    label: string;
    description: string;
  }>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-black tracking-wide text-slate-500 uppercase">
        Truy cập nhanh
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
              <ArrowRight className="mt-0.5 size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <p className="py-10 text-center text-sm font-medium text-slate-400">{message}</p>
  );
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatTime(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
