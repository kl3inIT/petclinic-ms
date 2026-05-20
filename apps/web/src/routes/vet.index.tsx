import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Medal,
  MessageSquareQuote,
  Phone,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/features/auth/store';
import {
  useMyProfile,
  useMyRatingsSummary,
  useMyRecentRatings,
  useMySchedule,
} from '@/features/vet-me/api';
import { enableDemoMode } from '@/features/vet-me/mock';
import { DemoBanner } from '@/features/vet-me/components/DemoBanner';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { StarRating } from '@/features/vet-me/components/StarRating';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import {
  WORKDAY_LABEL,
  WORKHOUR_LABEL,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';

export const Route = createFileRoute('/vet/')({
  component: VetDashboard,
});

/** JS Date.getDay(): 0=Sunday..6=Saturday → map sang enum BE Workday. */
const JS_DAY_TO_WORKDAY: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

function VetDashboard() {
  const username = useAuthStore((s) => s.user?.username) ?? '<your-username>';
  const profileQuery = useMyProfile();
  const summaryQuery = useMyRatingsSummary();
  const recentRatingsQuery = useMyRecentRatings(5);
  const scheduleQuery = useMySchedule();

  if (profileQuery.isError) {
    const status = (profileQuery.error as { response?: { status?: number } })
      ?.response?.status;
    if (status === 400) {
      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UserCircle className="size-5" />
              Tài khoản chưa liên kết với bác sĩ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Token của bạn không có claim <code className="rounded bg-muted px-1 py-0.5">vetId</code>.
              Admin cần liên kết account với 1 vet entity:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
{`UPDATE auth.users SET roles_csv = 'VET', vet_id = <id>
 WHERE username = '${username}';`}
            </pre>
            <p className="text-muted-foreground">Sau đó đăng xuất + đăng nhập lại để cấp token mới.</p>

            <div className="rounded-md border border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-violet-900">
                <Sparkles className="size-4" />
                Hoặc xem trước UI với dữ liệu mẫu
              </div>
              <p className="mb-3 text-xs text-violet-700">
                Bật chế độ demo để xem template /vet/* với hồ sơ + lịch trực +
                đánh giá + huy hiệu mock. Không thay đổi gì ở backend.
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
          Lỗi tải hồ sơ: {profileQuery.error?.message ?? 'unknown'}
        </CardContent>
      </Card>
    );
  }

  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const todayWorkday = JS_DAY_TO_WORKDAY[new Date().getDay()];
  const todaySlots = (scheduleQuery.data ?? [])
    .filter((s) => s.workday === todayWorkday)
    .sort(
      (a, b) =>
        WORKHOUR_ORDER.indexOf(a.workHour) - WORKHOUR_ORDER.indexOf(b.workHour),
    );

  const greeting = greetingByHour(new Date().getHours());

  return (
    <div className="space-y-6">
      <VetPageHeader
        icon={LayoutDashboard}
        title={
          profileQuery.isLoading
            ? 'Đang tải…'
            : `${greeting}, BS. ${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`
        }
        subtitle="Tổng quan công việc của bạn tại PetClinic hôm nay."
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquareQuote}
          label="Tổng đánh giá"
          value={summaryQuery.isLoading ? '…' : (summary?.count ?? 0).toString()}
          to="/vet/ratings"
          tint="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Điểm trung bình"
          value={
            summaryQuery.isLoading
              ? '…'
              : summary?.average == null
                ? '—'
                : summary.average.toFixed(2)
          }
          to="/vet/ratings"
          tint="amber"
        />
        <StatCard
          icon={CalendarDays}
          label="Khung trực hôm nay"
          value={
            scheduleQuery.isLoading ? '…' : todaySlots.length.toString()
          }
          to="/vet/schedule"
          tint="emerald"
        />
        <StatCard
          icon={Medal}
          label="Tổng khung tuần"
          value={
            scheduleQuery.isLoading
              ? '…'
              : (scheduleQuery.data?.length ?? 0).toString()
          }
          to="/vet/schedule"
          tint="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="size-5" />
              Hồ sơ tóm tắt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {profileQuery.isLoading ? (
              <>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </>
            ) : (
              <>
                <Row label="Email" value={profile?.email} />
                <Row
                  label="Điện thoại"
                  value={
                    profile?.phoneNumber ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3.5" />
                        {profile.phoneNumber}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <Row
                  label="Trạng thái"
                  value={
                    <Badge variant={profile?.active ? 'default' : 'secondary'}>
                      {profile?.active ? 'Đang hoạt động' : 'Tạm nghỉ'}
                    </Badge>
                  }
                />
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Chuyên môn</div>
                  <div className="flex flex-wrap gap-1">
                    {(profile?.specialties ?? []).length === 0 ? (
                      <span className="text-xs italic text-muted-foreground">
                        Chưa có
                      </span>
                    ) : (
                      profile?.specialties?.map((s) => (
                        <Badge key={s.id ?? s.name} variant="secondary">
                          {s.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <Link
                  to="/vet/profile"
                  className="inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary hover:underline"
                >
                  Sửa hồ sơ <ChevronRight className="size-3.5" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's schedule */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-5" />
              Lịch trực hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : todaySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Hôm nay ({WORKDAY_LABEL[todayWorkday]}) bạn không có lịch trực.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {WORKDAY_LABEL[todayWorkday]} — {todaySlots.length} khung giờ
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {todaySlots.map((s) => (
                    <Badge
                      key={s.workHour}
                      variant="outline"
                      className="border-emerald-300 bg-emerald-50 text-emerald-700"
                    >
                      {WORKHOUR_LABEL[s.workHour]}
                    </Badge>
                  ))}
                </div>
                <Link
                  to="/vet/schedule"
                  className="inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary hover:underline"
                >
                  Xem cả tuần <ChevronRight className="size-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent ratings */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-5" />
              Đánh giá gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRatingsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (recentRatingsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Star}
                title="Chưa có đánh giá"
                description="Khi khách hàng đánh giá, sẽ hiện ở đây."
              />
            ) : (
              <div className="space-y-3">
                {recentRatingsQuery.data?.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-md border bg-card/50 p-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">
                        {r.customerName}
                      </span>
                      <StarRating score={r.score} />
                    </div>
                    {r.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                ))}
                <Link
                  to="/vet/ratings"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Xem tất cả <ChevronRight className="size-3.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────────
function greetingByHour(h: number): string {
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm">{value ?? '—'}</span>
    </div>
  );
}

const TINT_CLASS: Record<string, string> = {
  blue: 'text-blue-600 bg-blue-100/60',
  amber: 'text-amber-600 bg-amber-100/60',
  emerald: 'text-emerald-600 bg-emerald-100/60',
  violet: 'text-violet-600 bg-violet-100/60',
};

interface StatCardProps {
  icon: typeof Star;
  label: string;
  value: string;
  to: '/vet/ratings' | '/vet/schedule' | '/vet/badges';
  tint: 'blue' | 'amber' | 'emerald' | 'violet';
}

function StatCard({ icon: Icon, label, value, to, tint }: StatCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-3 py-4">
          <div className={`rounded-lg p-2.5 ${TINT_CLASS[tint]}`}>
            <Icon className="size-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
