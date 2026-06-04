import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  AtSign,
  CalendarCheck,
  Copy,
  Lock,
  Mail,
  PawPrint,
  Phone,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store';
import {
  useGetMyOwnerProfile,
  useUpdateMyOwnerProfile,
} from '@/lib/api/generated/owners/owners';

import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';

export const Route = createFileRoute('/customer/profile/')({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const user = useAuthStore((s) => s.user);
  const username = user?.username ?? '—';
  const userId = user?.id ?? '—';

  const ownerQuery = useGetMyOwnerProfile();
  const updateOwner = useUpdateMyOwnerProfile();
  const [ownerForm, setOwnerForm] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    telephone: '',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const owner = ownerQuery.data;
    if (!owner) return;
    setOwnerForm({
      firstName: owner.firstName ?? '',
      lastName: owner.lastName ?? '',
      address: owner.address ?? '',
      city: owner.city ?? '',
      telephone: owner.telephone ?? '',
    });
    setDirty(false);
  }, [ownerQuery.data]);

  const setField = (k: keyof typeof ownerForm) => (v: string) => {
    setOwnerForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerForm.firstName.trim() || !ownerForm.lastName.trim()) {
      toast.error('Họ và tên không được trống');
      return;
    }
    updateOwner.mutate(
      { data: ownerForm },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật hồ sơ');
          setDirty(false);
        },
        onError: (err) => toast.error((err as Error).message || 'Cập nhật thất bại'),
      },
    );
  };

  const ownerProfileLoading = ownerQuery.isLoading || ownerQuery.isError;

  return (
    <>
      <ProfilePageHeader
        title="Hồ sơ của tôi"
        subtitle="Quản lý thông tin tài khoản, liên hệ và bảo mật."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Account & Owner column */}
        <div className="space-y-6">
          {/* Read-only account info — username + id + email tạm khoá */}
          <ProfileCard>
            <CardTitleRow
              icon={UserCircle2}
              title="Thông tin tài khoản"
              description="Một số mục dưới đây thuộc về tài khoản đăng nhập, không sửa trực tiếp."
            />

            <div className="mt-6 flex items-center gap-5">
              <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-white via-[#F2EFFF] to-[#DDD7FF] text-[#7C6CF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_34px_rgba(124,108,245,0.18)] ring-8 ring-[#F5F2FF]">
                <UserCircle2 className="size-14" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[17px] font-black text-slate-950">
                  {ownerQuery.data
                    ? `${ownerQuery.data.firstName ?? ''} ${ownerQuery.data.lastName ?? ''}`.trim()
                    : username}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(user?.roles?.length ? user.roles : ['USER']).map((role) => (
                    <Badge
                      key={role}
                      variant="secondary"
                      className="gap-1 rounded-md border border-[#E7E1FF] bg-[#F4F1FF] px-2 text-[10px] font-black text-[#6C5CEB]"
                    >
                      <ShieldCheck className="size-3" /> {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 divide-y divide-[#F0F0F7] border-t border-[#ECECF5]">
              <AccountRow
                icon={Mail}
                label="Email"
                value={username}
                lockedTooltip="Đổi email sẽ phát hành sau (workflow xác thực qua mã OTP). Liên hệ lễ tân nếu cần đổi gấp."
              />
              <AccountRow
                icon={Copy}
                label="Mã người dùng"
                value={String(userId)}
                mono
                action="Sao chép"
                onAction={() => {
                  void navigator.clipboard?.writeText(String(userId));
                  toast.success('Đã sao chép mã người dùng');
                }}
              />
              <AccountRow icon={CalendarCheck} label="Ngày tham gia" value="15/04/2024" />
            </div>
          </ProfileCard>

          {/* Editable owner profile — PATCH /owners/me */}
          <ProfileCard>
            <CardTitleRow
              icon={AtSign}
              title="Thông tin liên hệ"
              description="Thông tin này hiển thị cho bác sĩ + lễ tân khi bạn đặt lịch khám."
            />

            {ownerProfileLoading ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    id="profile-first-name"
                    label="Tên *"
                    value={ownerForm.firstName}
                    onChange={setField('firstName')}
                  />
                  <FormField
                    id="profile-last-name"
                    label="Họ *"
                    value={ownerForm.lastName}
                    onChange={setField('lastName')}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    id="profile-phone"
                    label="Điện thoại"
                    value={ownerForm.telephone}
                    onChange={setField('telephone')}
                    placeholder="0901xxxxxx"
                    leadingIcon={Phone}
                  />
                  <FormField
                    id="profile-city"
                    label="Thành phố"
                    value={ownerForm.city}
                    onChange={setField('city')}
                  />
                </div>
                <FormField
                  id="profile-address"
                  label="Địa chỉ"
                  value={ownerForm.address}
                  onChange={setField('address')}
                />

                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-xs font-medium text-slate-500">
                    {dirty ? 'Có thay đổi chưa lưu' : 'Đồng bộ với hệ thống'}
                  </span>
                  <Button
                    type="submit"
                    className="h-10 rounded-xl bg-[#7C6CF5] font-black hover:bg-[#6D5CE8]"
                    disabled={!dirty || ownerProfileLoading || updateOwner.isPending}
                  >
                    {updateOwner.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            )}
          </ProfileCard>
        </div>

        {/* Right column — security tips + quick links */}
        <div className="space-y-6">
          <ProfileCard>
            <CardTitleRow
              icon={ShieldCheck}
              title="Bảo vệ tài khoản"
              description="Thực hiện các bước sau để giữ thông tin an toàn."
            />
            <ul className="mt-5 space-y-3 text-sm font-medium text-slate-600">
              <SecurityTip
                title="Đổi mật khẩu định kỳ"
                description="Khuyến nghị 90 ngày/lần — nhất là sau khi đăng nhập trên máy lạ."
                cta="Đổi ngay"
                ctaTo="/customer/profile/security"
              />
              <SecurityTip
                title="Bật xác thực hai bước"
                description="Bảo vệ tài khoản kể cả khi mật khẩu bị lộ."
                cta="Cấu hình"
                ctaTo="/customer/profile/security"
              />
            </ul>
          </ProfileCard>

          <ProfileCard className="bg-gradient-to-br from-[#F6F2FF] via-[#FAF8FF] to-white">
            <CardTitleRow
              icon={PawPrint}
              title="Liên kết nhanh"
              description="Truy cập các trang phổ biến."
            />
            <div className="mt-4 space-y-2">
              <QuickLink to="/customer/book" label="Đặt lịch khám" />
              <QuickLink to="/customer/visits" label="Lịch sử khám" />
              <QuickLink to="/customer/pets" label="Thú cưng của tôi" />
            </div>
          </ProfileCard>
        </div>
      </div>
    </>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  leadingIcon: LeadingIcon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  leadingIcon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-black text-slate-500">
        {label}
      </Label>
      <div className="relative">
        {LeadingIcon ? (
          <LeadingIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-10 rounded-lg border-[#ECECF5] bg-white text-sm font-semibold ${
            LeadingIcon ? 'pl-9' : ''
          }`}
        />
      </div>
    </div>
  );
}

function AccountRow({
  icon: Icon,
  label,
  value,
  action,
  mono,
  lockedTooltip,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  action?: string;
  mono?: boolean;
  lockedTooltip?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl py-3.5 transition-colors hover:bg-[#FBFAFF] sm:grid-cols-[24px_1fr_auto] sm:items-center sm:px-2">
      <Icon className="hidden size-4 text-slate-500 sm:block" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p
          className={`mt-1 text-sm font-semibold break-words text-slate-900 ${
            mono ? 'font-mono text-xs' : ''
          }`}
        >
          {value}
        </p>
      </div>
      {lockedTooltip ? (
        <span
          title={lockedTooltip}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50/70 px-2 py-1 text-xs font-bold text-amber-700"
        >
          <Lock className="size-3.5" /> Sẽ có sau
        </span>
      ) : action ? (
        <Button
          variant="outline"
          size="xs"
          onClick={onAction}
          className="w-fit rounded-lg border-[#E1DAFF] bg-white text-xs font-black text-[#6D5CE8] shadow-sm hover:bg-[#F6F3FF]"
        >
          {action === 'Sao chép' ? <Copy className="size-3" /> : null}
          {action}
        </Button>
      ) : null}
    </div>
  );
}

function SecurityTip({
  title,
  description,
  cta,
  ctaTo,
}: {
  title: string;
  description: string;
  cta: string;
  ctaTo: '/customer/profile/security';
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-[#ECECF5] bg-[#FBFAFF] p-3">
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 font-medium text-slate-500">{description}</p>
      </div>
      <Button
        asChild
        size="xs"
        variant="outline"
        className="shrink-0 rounded-lg border-[#E1DAFF] bg-white text-xs font-black text-[#6D5CE8]"
      >
        <Link to={ctaTo}>{cta}</Link>
      </Button>
    </li>
  );
}

function QuickLink({
  to,
  label,
}: {
  to: '/customer/book' | '/customer/visits' | '/customer/pets';
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-11 items-center justify-between rounded-xl border border-[#ECECF5] bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-[#DED6FF] hover:bg-[#F7F4FF] hover:text-[#6D5CE8]"
    >
      <span>{label}</span>
      <span aria-hidden className="text-[#7C6CF5]">
        →
      </span>
    </Link>
  );
}
