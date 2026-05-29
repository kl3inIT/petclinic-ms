import { createFileRoute, Link } from '@tanstack/react-router';
import { ExternalLink, IdCard, Mail, Phone, ShieldCheck, UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store';
import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import { useMyProfile } from '@/features/vet-me/api';

export const Route = createFileRoute('/vet/settings/')({
  component: AccountPage,
});

function AccountPage() {
  const username = useAuthStore((s) => s.user?.username) ?? '—';
  const roles = useAuthStore((s) => s.user?.roles) ?? [];
  const { data: profile, isLoading } = useMyProfile();

  return (
    <>
      <ProfilePageHeader
        title="Tài khoản"
        subtitle="Thông tin định danh tài khoản bác sĩ. Phần lớn các trường do quản trị viên quản lý."
      />

      <ProfileCard>
        <CardTitleRow
          icon={UserCog}
          title="Thông tin đăng nhập"
          description="Username, role và trạng thái tài khoản."
        />
        <dl className="mt-5 divide-y divide-[#F0F0F7]">
          <Row label="Tên đăng nhập" value={username} mono />
          <Row
            label="Vai trò"
            value={
              roles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-violet-700 uppercase"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                '—'
              )
            }
          />
          <Row
            label="Mã bác sĩ"
            value={
              isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : profile?.id ? (
                `#${profile.id}`
              ) : (
                '—'
              )
            }
            mono
          />
          <Row
            label="Mã thẻ nội bộ"
            value={
              isLoading ? <Skeleton className="h-4 w-32" /> : (profile?.cardCode ?? '—')
            }
            mono
          />
        </dl>
      </ProfileCard>

      <ProfileCard>
        <CardTitleRow
          icon={Mail}
          title="Liên hệ"
          description="Email và số điện thoại hiển thị trên hồ sơ công khai."
        />
        <dl className="mt-5 divide-y divide-[#F0F0F7]">
          <Row
            label="Email"
            value={
              isLoading ? <Skeleton className="h-4 w-48" /> : (profile?.email ?? '—')
            }
            hint="Đổi email phát hành sau — workflow OTP xác thực."
          />
          <Row
            label="Số điện thoại"
            value={
              isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 text-slate-400" />
                  {profile?.phoneNumber || 'Chưa cập nhật'}
                </span>
              )
            }
            hint="Cập nhật tại trang Hồ sơ."
          />
        </dl>
        <div className="mt-4 flex justify-end">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-[#E4DEFF] text-xs font-bold text-[#6D5CE8]"
          >
            <Link to="/vet/profile">
              <IdCard className="size-3.5" />
              Mở trang Hồ sơ
              <ExternalLink className="size-3" />
            </Link>
          </Button>
        </div>
      </ProfileCard>

      <ProfileCard className="bg-gradient-to-r from-violet-50/60 to-white">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-600" />
          <div className="text-sm leading-6 font-medium text-slate-600">
            <p className="font-bold text-slate-900">Quyền hạn của bạn</p>
            <p className="mt-1 text-xs text-slate-500">
              Tài khoản VET có thể xem hồ sơ, chỉnh sửa tiểu sử, xem lịch trực và đánh
              giá. Các thao tác hành chính (gán chuyên khoa, bằng cấp, badge) cần do STAFF
              / ADMIN thực hiện.
            </p>
          </div>
        </div>
      </ProfileCard>
    </>
  );
}

function Row({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-start gap-4 py-3">
      <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      <div className="min-w-0">
        <div
          className={
            mono
              ? 'font-mono text-sm font-medium text-slate-900'
              : 'text-sm font-medium text-slate-900'
          }
        >
          {value}
        </div>
        {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
