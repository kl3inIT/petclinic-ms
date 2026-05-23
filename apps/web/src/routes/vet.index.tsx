import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock3,
  Grid2X2,
  Mail,
  MessageSquareQuote,
  PawPrint,
  Phone,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { StarRating } from '@/features/vet-me/components/StarRating';
import {
  useMyProfile,
  useMyRatingsSummary,
  useMyRecentRatings,
  useMySchedule,
} from '@/features/vet-me/api';
import { enableDemoMode } from '@/features/vet-me/mock';
import {
  JS_DAY_TO_WORKDAY,
  WORKDAY_LABEL,
  WORKHOUR_LABEL,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';
import type {
  WorkScheduleSlotResponseWorkHour,
  WorkScheduleSlotResponseWorkday,
} from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/vet/')({
  component: VetDashboard,
});

function VetDashboard() {
  const username = useAuthStore((s) => s.user?.username) ?? '<your-username>';
  const profileQuery = useMyProfile();
  const summaryQuery = useMyRatingsSummary();
  const recentRatingsQuery = useMyRecentRatings(5);
  const scheduleQuery = useMySchedule();

  if (profileQuery.isError) {
    const status = (profileQuery.error as { response?: { status?: number } })?.response
      ?.status;
    if (status === 400) {
      return (
        <Card className="border-destructive/40 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UserCircle className="size-5" />
              Tài khoản chưa liên kết với bác sĩ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Tài khoản <strong>{username}</strong> chưa được admin liên kết với hồ sơ bác
              sĩ. Vui lòng liên hệ quản trị viên để được thiết lập.
            </p>
            <p className="text-xs text-muted-foreground">
              Sau khi admin liên kết xong, đăng xuất rồi đăng nhập lại để cấp token mới.
            </p>

            <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-rose-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-violet-900">
                <Sparkles className="size-4" />
                Xem trước giao diện bằng dữ liệu mẫu
              </div>
              <p className="mb-3 text-xs text-violet-700">
                Chế độ demo hiển thị hồ sơ, lịch trực, đánh giá và huy hiệu mẫu. Không
                thay đổi dữ liệu backend.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-violet-300 bg-white text-violet-700 hover:bg-violet-100"
                onClick={() => enableDemoMode()}
              >
                <Sparkles className="size-3.5" />
                Bật chế độ demo
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="py-6 text-destructive">
          Lỗi tải hồ sơ:{' '}
          {profileQuery.error instanceof Error ? profileQuery.error.message : 'unknown'}
        </CardContent>
      </Card>
    );
  }

  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const todayWorkday = JS_DAY_TO_WORKDAY[new Date().getDay()] ?? 'MONDAY';
  const todaySlots = (scheduleQuery.data ?? [])
    .filter((s) => s.workday === todayWorkday)
    .sort(
      (a, b) =>
        WORKHOUR_ORDER.indexOf(a.workHour ?? '') -
        WORKHOUR_ORDER.indexOf(b.workHour ?? ''),
    );

  const greeting = greetingByHour(new Date().getHours());
  const fullName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  const displayName = fullName || username;

  return (
    <div className="space-y-5">
      <HeroSection
        greeting={greeting}
        displayName={displayName}
        loading={profileQuery.isLoading}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MessageSquareQuote}
          label="Tổng đánh giá"
          value={summaryQuery.isLoading ? '...' : (summary?.count ?? 0).toString()}
          helper="Đánh giá mới hôm nay"
          to="/vet/ratings"
          tone="indigo"
          watermark={Star}
        />
        <StatCard
          icon={TrendingUp}
          label="Điểm trung bình"
          value={
            summaryQuery.isLoading
              ? '...'
              : summary?.average == null
                ? '-'
                : summary.average.toFixed(2)
          }
          helper={summary?.average == null ? 'Chưa có đủ dữ liệu' : 'Từ toàn bộ đánh giá'}
          to="/vet/ratings"
          tone="amber"
          watermark={TrendingUp}
        />
        <StatCard
          icon={CalendarDays}
          label="Khung trực hôm nay"
          value={scheduleQuery.isLoading ? '...' : todaySlots.length.toString()}
          helper="Lịch trực hôm nay"
          to="/vet/schedule"
          tone="emerald"
          watermark={CalendarClock}
        />
        <StatCard
          icon={CalendarRange}
          label="Tổng khung tuần"
          value={
            scheduleQuery.isLoading ? '...' : (scheduleQuery.data?.length ?? 0).toString()
          }
          helper="Khung tuần này"
          to="/vet/schedule"
          tone="violet"
          watermark={CalendarRange}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.05fr_0.95fr_1.05fr]">
        <ProfileSummaryCard loading={profileQuery.isLoading} profile={profile} />
        <TodayScheduleCard
          loading={scheduleQuery.isLoading}
          todaySlots={todaySlots}
          todayWorkday={todayWorkday}
        />
        <RecentRatingsCard
          loading={recentRatingsQuery.isLoading}
          ratings={recentRatingsQuery.data ?? []}
        />
      </div>
    </div>
  );
}

interface HeroSectionProps {
  greeting: string;
  displayName: string;
  loading: boolean;
}

function HeroSection({ greeting, displayName, loading }: HeroSectionProps) {
  return (
    <section className="relative min-h-36 overflow-hidden rounded-xl border border-violet-100 bg-white/70 px-4 py-5 shadow-sm sm:px-7 sm:py-7">
      <div className="relative z-10 flex max-w-2xl items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm">
          <Grid2X2 className="size-7" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold text-slate-950 sm:text-3xl">
            {loading ? 'Đang tải...' : `${greeting}, BS. ${displayName}`}
            <span className="ml-2 inline-block origin-bottom-right text-xl">👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tổng quan công việc của bạn tại PetClinic hôm nay.
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute top-2 right-5 hidden h-full w-[360px] sm:block">
        <div className="absolute top-1 right-10 size-40 rounded-full bg-violet-100" />
        <div className="absolute top-12 right-28 text-violet-200">
          <PawPrint className="size-5 rotate-[-18deg]" />
        </div>
        <div className="absolute top-16 right-80 text-violet-200">
          <PawPrint className="size-4 rotate-12" />
        </div>
        <div className="absolute top-24 right-3 text-violet-200">
          <PawPrint className="size-6 rotate-12" />
        </div>
        <div className="absolute top-2 right-44 text-7xl drop-shadow-sm">🐕</div>
        <div className="absolute top-10 right-16 text-6xl drop-shadow-sm">🐈</div>
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  to: '/vet/ratings' | '/vet/schedule' | '/vet/badges';
  tone: 'indigo' | 'amber' | 'emerald' | 'violet';
  watermark: LucideIcon;
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  to,
  tone,
  watermark: Watermark,
}: StatCardProps) {
  return (
    <Link to={to} className="group block">
      <Card className="relative h-full overflow-hidden border-slate-200/80 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex min-h-32 items-center gap-4 p-4 sm:p-5">
          <div className={cn('rounded-xl p-3 shadow-sm', STAT_TONE[tone])}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              {label}
            </div>
            <div className="text-3xl leading-none font-semibold text-slate-950">
              {value}
            </div>
            <div className="text-xs text-slate-500">{helper}</div>
          </div>
          <Watermark className="absolute -right-2 bottom-2 size-16 text-slate-100 transition-colors group-hover:text-violet-100" />
        </CardContent>
      </Card>
    </Link>
  );
}

function ProfileSummaryCard({
  loading,
  profile,
}: {
  loading: boolean;
  profile: ReturnType<typeof useMyProfile>['data'];
}) {
  return (
    <DashboardCard
      icon={UserCircle}
      title="Hồ sơ tóm tắt"
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-violet-700"
        >
          <Link to="/vet/profile">Chỉnh sửa</Link>
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-2/3" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white">
            <InfoRow icon={Mail} label="Email" value={profile?.email ?? '-'} />
            <InfoRow
              icon={Phone}
              label="Điện thoại"
              value={profile?.phoneNumber ?? '-'}
            />
            <InfoRow
              icon={UserCircle}
              label="Trạng thái"
              value={
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-3 font-semibold',
                    profile?.active
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-slate-50 text-slate-600',
                  )}
                >
                  {profile?.active ? 'Đang hoạt động' : 'Tạm nghỉ'}
                </Badge>
              }
            />
            <div className="grid grid-cols-[1rem_5.5rem_minmax(0,1fr)] items-start gap-3 border-t px-4 py-3 text-sm">
              <Sparkles className="mt-0.5 size-4 text-slate-400" />
              <span className="text-slate-500">Chuyên môn</span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {(profile?.specialties ?? []).length === 0 ? (
                  <span className="text-slate-500">Chưa có</span>
                ) : (
                  profile?.specialties?.map((s) => (
                    <Badge
                      key={s.id ?? s.name}
                      variant="secondary"
                      className="rounded-full bg-violet-100 px-3 text-violet-700"
                    >
                      {s.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
          <Link
            to="/vet/profile"
            className="mt-3 flex items-center justify-between rounded-lg bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
          >
            Xem chi tiết hồ sơ
            <ChevronRight className="size-4" />
          </Link>
        </>
      )}
    </DashboardCard>
  );
}

function TodayScheduleCard({
  loading,
  todaySlots,
  todayWorkday,
}: {
  loading: boolean;
  todaySlots: Array<{ workHour?: WorkScheduleSlotResponseWorkHour }>;
  todayWorkday: WorkScheduleSlotResponseWorkday;
}) {
  return (
    <DashboardCard
      icon={CalendarDays}
      title="Lịch trực hôm nay"
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-violet-700"
        >
          <Link to="/vet/schedule">Xem lịch</Link>
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-52 w-full" />
      ) : todaySlots.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-lg bg-white text-center">
          <div className="relative mb-4">
            <div className="flex size-24 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <CalendarClock className="size-12" />
            </div>
            <div className="absolute -right-2 bottom-1 flex size-10 items-center justify-center rounded-full border-4 border-white bg-white text-violet-600 shadow-sm">
              <Clock3 className="size-6" />
            </div>
          </div>
          <p className="font-semibold text-slate-900">
            Hôm nay ({WORKDAY_LABEL[todayWorkday] ?? todayWorkday}) bạn không có lịch
            trực.
          </p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Thư giãn một chút hoặc cập nhật hồ sơ của bạn nhé.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-5 border-violet-200 text-violet-700"
          >
            <Link to="/vet/schedule">Xem lịch trực</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {WORKDAY_LABEL[todayWorkday] ?? todayWorkday} có {todaySlots.length} khung
            giờ.
          </div>
          <div className="flex flex-wrap gap-2">
            {todaySlots.map((s) => (
              <Badge
                key={s.workHour}
                variant="outline"
                className="rounded-full border-emerald-300 bg-emerald-50 px-3 py-1.5 text-emerald-700"
              >
                {s.workHour ? WORKHOUR_LABEL[s.workHour] : '-'}
              </Badge>
            ))}
          </div>
          <Button asChild variant="outline" className="border-violet-200 text-violet-700">
            <Link to="/vet/schedule">Xem cả tuần</Link>
          </Button>
        </div>
      )}
    </DashboardCard>
  );
}

function RecentRatingsCard({
  loading,
  ratings,
}: {
  loading: boolean;
  ratings: Array<{
    id?: number;
    customerName?: string;
    score?: number;
    description?: string;
  }>;
}) {
  return (
    <DashboardCard
      icon={Star}
      title="Đánh giá gần đây"
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-violet-700"
        >
          <Link to="/vet/ratings">Xem tất cả</Link>
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : ratings.length === 0 ? (
        <div className="[&>div]:min-h-56 [&>div]:border-slate-200 [&>div]:bg-white">
          <EmptyState
            icon={Star}
            title="Chưa có đánh giá"
            description="Khi khách hàng đánh giá, sẽ hiện ở đây."
            action={<Send className="mt-2 size-5 text-slate-300" />}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate font-semibold text-slate-900">
                  {r.customerName ?? 'Khách hàng'}
                </span>
                <StarRating score={r.score ?? 0} />
              </div>
              {r.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                  {r.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-100 px-4 py-4">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-950">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1rem_5.5rem_minmax(0,1fr)] items-center gap-3 border-t px-4 py-3 text-sm first:border-t-0">
      <Icon className="size-4 text-slate-400" />
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 truncate font-medium text-slate-900">{value}</span>
    </div>
  );
}

function greetingByHour(h: number): string {
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

const STAT_TONE = {
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
} as const;
