import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import {
  ArrowUpRight,
  Award,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  MessageSquareQuote,
  Pencil,
  Phone,
  Radio,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store';
import {
  useMyBadges,
  useMyProfile,
  useMyRatings,
  useMyRatingsSummary,
  useMySchedule,
} from '@/features/vet-me/api';
import { AreaTrend } from '@/features/vet-me/components/charts/AreaTrend';
import { CircleProgress } from '@/features/vet-me/components/charts/CircleProgress';
import { MiniBar } from '@/features/vet-me/components/charts/MiniBar';
import { Sparkline } from '@/features/vet-me/components/charts/Sparkline';
import { StarRating } from '@/features/vet-me/components/StarRating';
import { VetAvatar } from '@/features/vet-me/components/VetAvatar';
import { enableDemoMode } from '@/features/vet-me/mock';
import { bucketRatingsByWeek } from '@/features/vet-me/stats';
import { JS_DAY_TO_WORKDAY, WORKDAY_LABEL, WORKHOUR_ORDER } from '@/features/vets/labels';
import type {
  WorkScheduleSlotResponse,
  WorkScheduleSlotResponseWorkHour,
} from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/vet/')({
  component: VetDashboard,
});

function VetDashboard() {
  const username = useAuthStore((s) => s.user?.username) ?? 'bác sĩ';
  const profileQuery = useMyProfile();
  const summaryQuery = useMyRatingsSummary();
  const ratingsHistoryQuery = useMyRatings(0, 50);
  const scheduleQuery = useMySchedule();
  const badgesQuery = useMyBadges(0, 1);

  const ratings = useMemo(
    () => ratingsHistoryQuery.data?.content ?? [],
    [ratingsHistoryQuery.data],
  );
  const recentRatings = ratings.slice(0, 4);

  const weekBuckets = useMemo(() => bucketRatingsByWeek(ratings, 8), [ratings]);

  if (profileQuery.isError) {
    return <ProfileUnlinkedCard username={username} error={profileQuery.error} />;
  }

  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const todayWorkday = JS_DAY_TO_WORKDAY[new Date().getDay()] ?? 'MONDAY';
  const allTodaySlots = (scheduleQuery.data ?? []).filter(
    (s) => s.workday === todayWorkday,
  );
  const totalSlotsPerDay = WORKHOUR_ORDER.length;

  const greeting = greetingByHour(new Date().getHours());
  const fullName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  const displayName = fullName || username;

  const sparklineCounts = weekBuckets.map((b) => b.count);
  const sparklineAvg = weekBuckets.map((b) => b.avg ?? 0);

  return (
    <div className="space-y-6">
      <HeroStrip
        loading={profileQuery.isLoading}
        greeting={greeting}
        displayName={displayName}
        profile={profile}
        ratingAvg={summary?.average}
        ratingCount={summary?.count ?? 0}
        todaySlotCount={allTodaySlots.length}
        badgeCount={badgesQuery.data?.totalElements ?? 0}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MessageSquareQuote}
          tone="indigo"
          label="Tổng đánh giá"
          value={
            summaryQuery.isLoading ? '…' : (summary?.count ?? 0).toLocaleString('vi-VN')
          }
          delta={deltaLabel(weekBuckets, 'count')}
          chart={
            <Sparkline
              values={sparklineCounts}
              strokeClassName="stroke-indigo-500"
              fillClassName="fill-indigo-200/50"
            />
          }
          to="/vet/ratings"
        />
        <StatCard
          icon={Star}
          tone="amber"
          label="Điểm trung bình"
          value={
            summaryQuery.isLoading
              ? '…'
              : summary?.average == null
                ? '—'
                : summary.average.toFixed(2)
          }
          delta={summary?.average != null ? deltaLabel(weekBuckets, 'avg') : null}
          chart={
            <Sparkline
              values={sparklineAvg}
              strokeClassName="stroke-amber-500"
              fillClassName="fill-amber-200/50"
            />
          }
          to="/vet/ratings"
        />
        <StatCard
          icon={CalendarClock}
          tone="emerald"
          label="Khung trực hôm nay"
          value={
            scheduleQuery.isLoading ? '…' : `${allTodaySlots.length}/${totalSlotsPerDay}`
          }
          delta={`${WORKDAY_LABEL[todayWorkday]}`}
          chart={
            <CircleProgress
              size={48}
              strokeWidth={5}
              value={allTodaySlots.length}
              max={totalSlotsPerDay}
              trackClassName="stroke-emerald-100"
              progressClassName="stroke-emerald-500"
              label={
                <span className="text-xs font-bold text-emerald-700">
                  {Math.round((allTodaySlots.length / totalSlotsPerDay) * 100)}%
                </span>
              }
            />
          }
          to="/vet/schedule"
        />
        <StatCard
          icon={Award}
          tone="violet"
          label="Huy hiệu đã đạt"
          value={
            badgesQuery.isLoading ? '…' : `${badgesQuery.data?.totalElements ?? 0}/6`
          }
          delta="Lộ trình thành tích"
          chart={
            <MiniBar
              values={[2, 4, 3, 5, 4, 6]}
              barClassName="fill-violet-300"
              highlightLast
              height={48}
            />
          }
          to="/vet/badges"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <TodayTimelineCard
          loading={scheduleQuery.isLoading}
          slots={allTodaySlots}
          todayWorkday={todayWorkday}
        />
        <RecentRatingsCard
          loading={ratingsHistoryQuery.isLoading}
          ratings={recentRatings}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <TrendCard loading={ratingsHistoryQuery.isLoading} weekBuckets={weekBuckets} />
        <DistributionCard
          loading={summaryQuery.isLoading}
          distribution={summary?.distribution ?? {}}
          total={summary?.count ?? 0}
        />
      </div>

      <ProfileContactCard loading={profileQuery.isLoading} profile={profile} />
    </div>
  );
}

interface HeroStripProps {
  loading: boolean;
  greeting: string;
  displayName: string;
  profile: ReturnType<typeof useMyProfile>['data'];
  ratingAvg?: number;
  ratingCount: number;
  todaySlotCount: number;
  badgeCount: number;
}

function HeroStrip({
  loading,
  greeting,
  displayName,
  profile,
  ratingAvg,
  ratingCount,
}: HeroStripProps) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/40 to-white shadow-sm">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-50 md:block">
        <div className="absolute top-6 right-12 size-48 rounded-full bg-violet-100/60 blur-2xl" />
        <div className="absolute right-24 bottom-4 size-32 rounded-full bg-rose-100/60 blur-2xl" />
      </div>

      <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-5">
          {loading ? (
            <Skeleton className="size-24 rounded-full" />
          ) : (
            <VetAvatar
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              photoUrl={profile?.photoUrl}
              size="xl"
              ring
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-violet-600 uppercase">
              <Sparkles className="size-3.5" />
              {greeting}
            </div>
            <h1 className="mt-1 truncate text-2xl leading-tight font-bold text-slate-950 sm:text-3xl">
              BS. {loading ? '...' : displayName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700',
                  !profile?.active && 'border-slate-200 bg-slate-50 text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'mr-1.5 size-1.5 rounded-full',
                    profile?.active ? 'bg-emerald-500' : 'bg-slate-400',
                  )}
                />
                {profile?.active ? 'Đang hoạt động' : 'Tạm nghỉ'}
              </Badge>
              {(profile?.specialties ?? []).slice(0, 3).map((s) => (
                <Badge
                  key={s.id ?? s.name}
                  variant="secondary"
                  className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700"
                >
                  {s.name}
                </Badge>
              ))}
              {(profile?.specialties?.length ?? 0) > 3 && (
                <Badge
                  variant="outline"
                  className="rounded-full border-violet-200 bg-white px-2 py-1 text-xs text-violet-700"
                >
                  +{(profile?.specialties?.length ?? 0) - 3}
                </Badge>
              )}
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="size-4 text-slate-400" />
              {dateLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="flex flex-col items-start rounded-xl border border-amber-100 bg-amber-50/50 px-5 py-3 lg:items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl leading-none font-bold text-slate-950 tabular-nums">
                {ratingAvg == null ? '—' : ratingAvg.toFixed(1)}
              </span>
              <StarRating score={Math.round(ratingAvg ?? 0)} size="md" />
            </div>
            <span className="mt-1 text-xs font-medium text-slate-500">
              từ {ratingCount.toLocaleString('vi-VN')} lượt đánh giá
            </span>
          </div>
          <Button
            asChild
            className="h-10 bg-violet-600 px-5 text-white shadow-sm hover:bg-violet-700"
          >
            <Link to="/vet/profile">
              <Pencil className="size-4" />
              Chỉnh sửa hồ sơ
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  tone: 'indigo' | 'amber' | 'emerald' | 'violet';
  label: string;
  value: string;
  delta?: ReactNode;
  chart?: ReactNode;
  to: '/vet/ratings' | '/vet/schedule' | '/vet/badges';
}

const TONE_PILL: Record<StatCardProps['tone'], string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
};

function StatCard({ icon: Icon, tone, label, value, delta, chart, to }: StatCardProps) {
  return (
    <Link to={to} className="group block">
      <Card className="h-full overflow-hidden border-slate-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className={cn('rounded-lg p-2.5', TONE_PILL[tone])}>
              <Icon className="size-5" />
            </div>
            <ArrowUpRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-500" />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {label}
              </div>
              <div className="mt-1 text-3xl leading-none font-bold text-slate-950 tabular-nums">
                {value}
              </div>
            </div>
            <div className="shrink-0">{chart}</div>
          </div>
          {delta && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp className="size-3.5 text-slate-400" />
              {delta}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function TodayTimelineCard({
  loading,
  slots,
  todayWorkday,
}: {
  loading: boolean;
  slots: WorkScheduleSlotResponse[];
  todayWorkday: keyof typeof WORKDAY_LABEL;
}) {
  const occupied = new Set(slots.map((s) => s.workHour));
  const currentHour = new Date().getHours();

  return (
    <SectionCard
      icon={CalendarDays}
      title="Lịch trực hôm nay"
      subtitle={`${WORKDAY_LABEL[todayWorkday]} • ${slots.length} khung giờ`}
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-violet-700"
        >
          <Link to="/vet/schedule">
            Xem cả tuần
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <CalendarDays className="size-7" />
          </div>
          <p className="mt-3 font-semibold text-slate-900">Không có lịch trực hôm nay</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Tận hưởng một ngày nghỉ ngơi. Nếu cần điều chỉnh lịch, liên hệ admin.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-1.5 pl-3">
          <span className="absolute top-1 bottom-1 left-1 w-px bg-slate-200" />
          {WORKHOUR_ORDER.map((hour) => {
            const isOn = occupied.has(hour);
            if (!isOn) return null;
            const status = slotStatus(hour, currentHour);
            return (
              <li key={hour} className="relative pl-5">
                <span
                  className={cn(
                    'absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full ring-4 ring-white',
                    status === 'live' && 'bg-emerald-500',
                    status === 'upcoming' && 'bg-violet-400',
                    status === 'done' && 'bg-slate-300',
                  )}
                />
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-colors',
                    status === 'live' && 'border-emerald-200 bg-emerald-50/60',
                    status === 'upcoming' &&
                      'border-violet-100 bg-white hover:bg-violet-50/40',
                    status === 'done' && 'border-slate-100 bg-slate-50/60',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Clock3
                      className={cn(
                        'size-4 shrink-0',
                        status === 'live'
                          ? 'text-emerald-600'
                          : status === 'done'
                            ? 'text-slate-400'
                            : 'text-violet-500',
                      )}
                    />
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        status === 'done'
                          ? 'text-slate-500 line-through'
                          : 'text-slate-900',
                      )}
                    >
                      {formatHour(hour)}
                    </span>
                  </div>
                  <StatusPill status={status} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}

function StatusPill({ status }: { status: SlotStatus }) {
  if (status === 'live') {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-100 text-emerald-700">
        <Radio className="size-3 animate-pulse" />
        Đang trực
      </Badge>
    );
  }
  if (status === 'done') {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-slate-200 bg-white text-slate-500"
      >
        <CheckCircle2 className="size-3" />
        Đã qua
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-violet-200 bg-violet-50 text-violet-700"
    >
      <Clock3 className="size-3" />
      Sắp tới
    </Badge>
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
    rateDate?: string;
  }>;
}) {
  return (
    <SectionCard
      icon={Star}
      title="Đánh giá gần đây"
      subtitle={ratings.length > 0 ? `${ratings.length} đánh giá mới nhất` : undefined}
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-violet-700"
        >
          <Link to="/vet/ratings">
            Tất cả
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 text-center">
          <Star className="mb-2 size-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Chưa có đánh giá</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Đánh giá khách hàng sẽ hiển thị ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ratings.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-slate-200/70 bg-white p-3 text-sm transition-colors hover:border-violet-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <VetAvatar
                    firstName={r.customerName?.split(' ')[0]}
                    lastName={r.customerName?.split(' ').slice(-1)[0]}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {r.customerName ?? 'Ẩn danh'}
                    </div>
                    {r.rateDate && (
                      <div className="text-xs text-slate-500">
                        {formatDateShort(new Date(r.rateDate))}
                      </div>
                    )}
                  </div>
                </div>
                <StarRating score={r.score ?? 0} />
              </div>
              {r.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                  "{r.description}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TrendCard({
  loading,
  weekBuckets,
}: {
  loading: boolean;
  weekBuckets: ReturnType<typeof bucketRatingsByWeek>;
}) {
  const hasData = weekBuckets.some((b) => b.count > 0);
  return (
    <SectionCard
      icon={TrendingUp}
      title="Xu hướng đánh giá"
      subtitle="8 tuần gần nhất — số lượt đánh giá / tuần"
    >
      {loading ? (
        <Skeleton className="h-44 w-full" />
      ) : !hasData ? (
        <div className="flex h-44 flex-col items-center justify-center text-sm text-slate-400">
          <TrendingUp className="mb-2 size-8 text-slate-300" />
          Chưa đủ dữ liệu để hiển thị xu hướng
        </div>
      ) : (
        <div className="text-violet-400">
          <AreaTrend
            values={weekBuckets.map((b) => b.count)}
            labels={weekBuckets.map((b) => b.label)}
            height={180}
            strokeClassName="stroke-violet-500"
          />
        </div>
      )}
    </SectionCard>
  );
}

function DistributionCard({
  loading,
  distribution,
  total,
}: {
  loading: boolean;
  distribution: Record<string, number>;
  total: number;
}) {
  const rows = [5, 4, 3, 2, 1].map((star) => {
    const count = distribution[star.toString()] ?? 0;
    const pct = total === 0 ? 0 : (count / total) * 100;
    return { star, count, pct };
  });

  return (
    <SectionCard icon={Star} title="Phân bố điểm" subtitle="Theo thang 1–5 sao">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.star} className="flex items-center gap-3 text-sm">
              <span className="inline-flex w-8 items-center gap-1 font-semibold text-slate-700 tabular-nums">
                {r.star}
                <Star className="size-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all"
                  style={{ width: `${r.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-medium text-slate-600 tabular-nums">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ProfileContactCard({
  loading,
  profile,
}: {
  loading: boolean;
  profile: ReturnType<typeof useMyProfile>['data'];
}) {
  return (
    <SectionCard
      icon={UserCircle}
      title="Thông tin liên hệ"
      subtitle="Khách hàng có thể thấy thông tin này khi đặt lịch"
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 text-violet-700"
        >
          <Link to="/vet/profile">
            Chỉnh sửa
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ContactTile icon={Mail} label="Email" value={profile?.email} />
          <ContactTile icon={Phone} label="Điện thoại" value={profile?.phoneNumber} />
          <ContactTile
            icon={Sparkles}
            label="Chuyên môn"
            value={
              (profile?.specialties ?? []).length === 0
                ? null
                : `${profile?.specialties?.length} chuyên khoa`
            }
          />
        </div>
      )}
    </SectionCard>
  );
}

function ContactTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white p-3">
      <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {value || <span className="text-slate-400 italic">Chưa cập nhật</span>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200/70 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Icon className="size-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-950">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ProfileUnlinkedCard({ username, error }: { username: string; error: unknown }) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 400) {
    return (
      <Card className="border-destructive/40 bg-white shadow-sm">
        <CardContent className="space-y-4 p-6 text-sm">
          <div className="flex items-start gap-3 text-destructive">
            <UserCircle className="mt-0.5 size-5" />
            <div>
              <p className="font-semibold">Tài khoản chưa liên kết với bác sĩ</p>
              <p className="mt-1 text-destructive/80">
                Tài khoản <strong>{username}</strong> chưa được admin liên kết với hồ sơ
                bác sĩ. Sau khi liên kết xong, đăng xuất và đăng nhập lại.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-rose-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-medium text-violet-900">
              <Sparkles className="size-4" />
              Xem trước giao diện bằng dữ liệu mẫu
            </div>
            <p className="mb-3 text-xs text-violet-700">
              Chế độ demo hiển thị hồ sơ, lịch trực, đánh giá và huy hiệu mẫu. Không thay
              đổi dữ liệu backend.
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
        Lỗi tải hồ sơ: {error instanceof Error ? error.message : 'unknown'}
      </CardContent>
    </Card>
  );
}

type SlotStatus = 'done' | 'live' | 'upcoming';

function slotStatus(
  hour: WorkScheduleSlotResponseWorkHour,
  currentHour: number,
): SlotStatus {
  const match = /^HOUR_(\d+)_(\d+)$/.exec(hour);
  if (!match) return 'upcoming';
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (currentHour >= end) return 'done';
  if (currentHour >= start && currentHour < end) return 'live';
  return 'upcoming';
}

function formatHour(hour: WorkScheduleSlotResponseWorkHour): string {
  const match = /^HOUR_(\d+)_(\d+)$/.exec(hour);
  if (!match) return hour;
  return `${pad2(Number(match[1]))}:00 – ${pad2(Number(match[2]))}:00`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDateShort(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function greetingByHour(h: number): string {
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function deltaLabel(
  buckets: ReturnType<typeof bucketRatingsByWeek>,
  key: 'count' | 'avg',
): string {
  if (buckets.length < 2) return 'Chưa đủ dữ liệu so sánh';
  const lastBucket = buckets[buckets.length - 1];
  const prevBucket = buckets[buckets.length - 2];
  if (!lastBucket || !prevBucket) return 'Chưa đủ dữ liệu so sánh';
  const curr = lastBucket[key] ?? 0;
  const prev = prevBucket[key] ?? 0;
  if (key === 'count') {
    const diff = curr - prev;
    if (diff === 0) return 'Không đổi so với tuần trước';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff} so với tuần trước`;
  }
  const diff = (curr - prev).toFixed(2);
  if (Number(diff) === 0) return 'Không đổi so với tuần trước';
  const sign = Number(diff) > 0 ? '+' : '';
  return `${sign}${diff} so với tuần trước`;
}
