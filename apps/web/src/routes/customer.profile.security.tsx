import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Globe,
  KeyRound,
  Laptop,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/lib/form/FieldError';
import { useChangeMyPassword } from '@/features/auth/password';
import { useAuthStore } from '@/features/auth/store';
import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import { changePasswordSchema } from '@/features/customer-profile/schemas';

export const Route = createFileRoute('/customer/profile/security')({
  component: SecurityPage,
});

function SecurityPage() {
  const clear = useAuthStore((s) => s.clear);
  const changePassword = useChangeMyPassword();

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: { onChange: changePasswordSchema },
    onSubmit: ({ value }) => {
      changePassword.mutate(
        {
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        },
        {
          onSuccess: () => {
            toast.success(
              'Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị khác.',
            );
            form.reset();
            // Session hiện tại có thể vẫn dùng access token cũ (15min) — nhưng refresh
            // tokens đều revoke nên sau khi access expire sẽ force re-login. Cẩn thận
            // hơn: clear ngay session hiện tại.
            setTimeout(() => {
              clear();
              window.location.href = '/login';
            }, 1500);
          },
          onError: (err) => {
            toast.error((err as Error).message || 'Đổi mật khẩu thất bại');
          },
        },
      );
    },
  });

  return (
    <>
      <ProfilePageHeader
        title="Bảo mật tài khoản"
        subtitle="Đổi mật khẩu, quản lý phiên đăng nhập và xác thực hai bước."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Change password */}
        <ProfileCard>
          <CardTitleRow
            icon={KeyRound}
            title="Đổi mật khẩu"
            description="Sau khi đổi, tất cả phiên đăng nhập khác sẽ bị đăng xuất tự động."
          />

          <form
            id="change-password-form"
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Field
              name="currentPassword"
              children={(field) => (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-[11px] font-black text-slate-500"
                  >
                    Mật khẩu hiện tại *
                  </Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-10 rounded-lg border-[#ECECF5] bg-white text-sm font-semibold"
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="newPassword"
              children={(field) => (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-[11px] font-black text-slate-500"
                  >
                    Mật khẩu mới *{' '}
                    <span className="text-slate-400">
                      (8-72 ký tự, ≥1 thường, ≥1 hoa, ≥1 số)
                    </span>
                  </Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-10 rounded-lg border-[#ECECF5] bg-white text-sm font-semibold"
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="confirmPassword"
              children={(field) => (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-[11px] font-black text-slate-500"
                  >
                    Xác nhận mật khẩu mới *
                  </Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="h-10 rounded-lg border-[#ECECF5] bg-white text-sm font-semibold"
                  />
                  <FieldError field={field} />
                </div>
              )}
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-medium text-slate-500">
                Mật khẩu được lưu dưới dạng BCrypt (12 rounds).
              </span>
              <Button
                type="submit"
                disabled={changePassword.isPending}
                className="h-10 rounded-xl bg-[#7C6CF5] font-black hover:bg-[#6D5CE8]"
              >
                {changePassword.isPending ? 'Đang lưu…' : 'Đổi mật khẩu'}
              </Button>
            </div>
          </form>
        </ProfileCard>

        {/* Right column */}
        <div className="space-y-6">
          {/* 2FA stub */}
          <ProfileCard>
            <CardTitleRow
              icon={ShieldCheck}
              title="Xác thực hai bước (2FA)"
              description="Nhập mã OTP từ ứng dụng Authenticator mỗi lần đăng nhập."
            />
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-amber-900">Đang phát triển</p>
                <p className="mt-0.5 text-xs leading-5 font-medium text-amber-700">
                  Tính năng 2FA sẽ ra mắt cùng phase Security Iter 6 (TOTP + recovery
                  codes).
                </p>
              </div>
              <Badge className="shrink-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
                Soon
              </Badge>
            </div>
          </ProfileCard>

          {/* Active sessions */}
          <ProfileCard>
            <CardTitleRow
              icon={Laptop}
              title="Phiên đăng nhập"
              description="Refresh tokens active. Đổi mật khẩu sẽ revoke hết."
            />
            <ul className="mt-4 space-y-2">
              <SessionItem
                icon={Laptop}
                device="Trình duyệt hiện tại"
                meta="Chrome • Windows • Hà Nội"
                current
              />
              <SessionItem icon={Smartphone} device="iPhone Safari" meta="3 ngày trước" />
              <SessionItem icon={Globe} device="Phiên web khác" meta="1 tuần trước" />
            </ul>
            <p className="mt-3 text-xs font-medium text-slate-500">
              <Sparkles className="-mt-0.5 mr-1 inline size-3" />
              Danh sách phiên ở mức demo. Backend sẽ expose list/devices ở Phase Security
              Iter 7.
            </p>
          </ProfileCard>

          {/* Tip */}
          <ProfileCard className="bg-gradient-to-br from-rose-50 via-white to-amber-50">
            <CardTitleRow
              icon={AlertTriangle}
              title="Cảnh báo bảo mật"
              description="Khi nghi ngờ tài khoản bị xâm phạm."
            />
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs leading-6 font-medium text-slate-600">
              <li>Đổi mật khẩu ngay lập tức.</li>
              <li>Liên hệ lễ tân (1900 8268) để khoá tạm thời.</li>
              <li>Xem lại hoạt động khám gần đây của thú cưng.</li>
            </ol>
          </ProfileCard>
        </div>
      </div>
    </>
  );
}

function SessionItem({
  icon: Icon,
  device,
  meta,
  current,
}: {
  icon: React.ComponentType<{ className?: string }>;
  device: string;
  meta: string;
  current?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-[#ECECF5] bg-[#FBFAFF] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#7C6CF5] shadow-sm ring-1 ring-[#ECE7FF]">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{device}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{meta}</p>
        </div>
      </div>
      {current ? (
        <Badge className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          Hiện tại
        </Badge>
      ) : (
        <Button
          size="xs"
          variant="outline"
          className="shrink-0 rounded-lg border-rose-100 text-xs font-black text-rose-600 hover:bg-rose-50"
          disabled
          title="Revoke per-session sẽ enable khi BE expose endpoint /sessions/{id}"
        >
          Đăng xuất
        </Button>
      )}
    </li>
  );
}
