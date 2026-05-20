import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarDays, Medal, Star, UserCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useMyProfile, useMyRatingsSummary } from '@/features/vet-me/api';

export const Route = createFileRoute('/vet/')({
  component: VetDashboard,
});

function VetDashboard() {
  const profileQuery = useMyProfile();
  const summaryQuery = useMyRatingsSummary();

  if (profileQuery.isError) {
    const status = (profileQuery.error as { response?: { status?: number } })
      ?.response?.status;
    if (status === 400) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              Tài khoản chưa liên kết với bác sĩ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Token của bạn không có claim <code>vetId</code>. Admin cần liên kết
              account với 1 vet entity:
            </p>
            <pre className="bg-muted px-3 py-2 rounded text-xs">
              UPDATE auth.users SET roles_csv = 'VET', vet_id = &lt;id&gt;
              WHERE username = '{profileQuery.error?.message ?? '<your-username>'}';
            </pre>
            <p>Sau đó đăng xuất + đăng nhập lại để cấp token mới.</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {profileQuery.isLoading
            ? 'Đang tải…'
            : `Chào BS. ${profileQuery.data?.firstName ?? ''} ${profileQuery.data?.lastName ?? ''}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tổng quan công việc của bạn tại PetClinic.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Star}
          label="Số đánh giá"
          value={summaryQuery.isLoading ? '…' : (summaryQuery.data?.count ?? 0).toString()}
          to="/vet/ratings"
        />
        <StatCard
          icon={Star}
          label="Điểm trung bình"
          value={
            summaryQuery.isLoading
              ? '…'
              : summaryQuery.data?.average == null
                ? '—'
                : summaryQuery.data.average.toFixed(2)
          }
          to="/vet/ratings"
        />
        <StatCard
          icon={CalendarDays}
          label="Lịch trực tuần này"
          value="Xem"
          to="/vet/schedule"
        />
        <StatCard
          icon={Medal}
          label="Huy hiệu đạt được"
          value="Xem"
          to="/vet/badges"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-5 w-5" />
            Hồ sơ tóm tắt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {profileQuery.isLoading ? (
            <>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground">Email: </span>
                {profileQuery.data?.email}
              </div>
              <div>
                <span className="text-muted-foreground">Điện thoại: </span>
                {profileQuery.data?.phoneNumber ?? '—'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Trạng thái: </span>
                <Badge variant={profileQuery.data?.active ? 'default' : 'secondary'}>
                  {profileQuery.data?.active ? 'Đang hoạt động' : 'Tạm nghỉ'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1 pt-2">
                {(profileQuery.data?.specialties ?? []).map((s) => (
                  <Badge key={s.id ?? s.name} variant="secondary">
                    {s.name}
                  </Badge>
                ))}
              </div>
              <div className="pt-2">
                <Link
                  to="/vet/profile"
                  className="text-sm text-primary hover:underline"
                >
                  Sửa hồ sơ →
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: typeof Star;
  label: string;
  value: string;
  to: '/vet/ratings' | '/vet/schedule' | '/vet/badges';
}

function StatCard({ icon: Icon, label, value, to }: StatCardProps) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
