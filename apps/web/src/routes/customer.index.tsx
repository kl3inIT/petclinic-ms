import { Link, createFileRoute } from '@tanstack/react-router';
import { CalendarCheck, Clock, PawPrint, Plus, Stethoscope } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VisitStatusBadge } from '@/features/visits/components/VisitStatusBadge';
import { useSearchVisits } from '@/lib/api/generated/visits/visits';
import { useListPets } from '@/lib/api/generated/pets/pets';
import { useAuthStore } from '@/features/auth/store';
import { SearchVisitsStatus } from '@/lib/api/generated/model';

export const Route = createFileRoute('/customer/')({
  component: CustomerDashboard,
});

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function CustomerDashboard() {
  const user = useAuthStore((s) => s.user);

  // BE auto-filter visits theo customerUserId khi role = USER.
  const upcomingQuery = useSearchVisits({
    pageable: { page: 0, size: 5, sort: ['scheduledAt,asc'] },
    status: SearchVisitsStatus.SCHEDULED,
  });
  const recentQuery = useSearchVisits({
    pageable: { page: 0, size: 5, sort: ['scheduledAt,desc'] },
  });
  const petsQuery = useListPets({
    pageable: { page: 0, size: 100, sort: ['name,asc'] },
  });

  const upcoming = upcomingQuery.data?.content ?? [];
  const recent = recentQuery.data?.content ?? [];
  const pets = petsQuery.data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {user?.username ?? 'bạn'} 👋</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi lịch khám, hồ sơ thú cưng và đặt lịch mới — tất cả ở một nơi.
          </p>
        </div>
        <Button asChild>
          <Link to="/customer/book">
            <Plus className="size-4" /> Đặt lịch khám mới
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarCheck}
          label="Lịch sắp tới"
          value={upcomingQuery.data?.totalElements ?? 0}
          loading={upcomingQuery.isLoading}
          color="bg-blue-500"
        />
        <StatCard
          icon={Stethoscope}
          label="Lượt khám đã thực hiện"
          value={recentQuery.data?.totalElements ?? 0}
          loading={recentQuery.isLoading}
          color="bg-emerald-500"
        />
        <StatCard
          icon={PawPrint}
          label="Thú cưng"
          value={pets.length}
          loading={petsQuery.isLoading}
          color="bg-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Lịch khám sắp tới</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/customer/visits">Xem tất cả</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingQuery.isLoading ? (
              <ListSkeleton />
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="Chưa có lịch khám"
                desc="Đặt lịch ngay để được chăm sóc sớm nhất."
                ctaTo="/customer/book"
                ctaLabel="Đặt lịch"
              />
            ) : (
              upcoming.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="size-4 text-primary" />
                      {v.scheduledAt ? dateFmt.format(new Date(v.scheduledAt)) : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pet #{v.petId} • Bác sĩ #{v.vetId}
                      {v.reason ? ` • ${v.reason}` : ''}
                    </p>
                  </div>
                  {v.status ? <VisitStatusBadge status={v.status} /> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/customer/visits">Xem tất cả</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentQuery.isLoading ? (
              <ListSkeleton />
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có lượt khám nào.</p>
            ) : (
              recent.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {v.scheduledAt ? dateFmt.format(new Date(v.scheduledAt)) : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {v.diagnosis
                        ? `Chẩn đoán: ${v.diagnosis}`
                        : v.reason || 'Khám tổng quát'}
                    </p>
                  </div>
                  {v.status ? <VisitStatusBadge status={v.status} /> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  color,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: number;
  loading?: boolean;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-12 items-center justify-center rounded-xl text-white ${color}`}
        >
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </>
  );
}

function EmptyState({
  title,
  desc,
  ctaTo,
  ctaLabel,
}: {
  title: string;
  desc: string;
  ctaTo: '/customer/book';
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <CalendarCheck className="size-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Button asChild size="sm">
        <Link to={ctaTo}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
