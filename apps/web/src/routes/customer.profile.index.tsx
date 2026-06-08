import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  AtSign,
  CalendarCheck,
  Camera,
  Copy,
  Lock,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/store';
import {
  useDeleteMyOwnerAvatar,
  useGetMyOwnerProfile,
  useUpdateMyOwnerProfile,
  useUploadMyOwnerAvatar,
} from '@/lib/api/generated/owners/owners';

import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import {
  AvatarCropField,
  type AvatarCropHandle,
} from '@/features/customer-profile/components/AvatarCropField';

export const Route = createFileRoute('/customer/profile/')({
  component: CustomerProfilePage,
});

/* ─────────────────────────── helpers ─────────────────────────── */

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function validateFile(file: File): boolean {
  if (!ACCEPTED.includes(file.type)) {
    toast.error('Chỉ chấp nhận JPEG / PNG / WebP');
    return false;
  }
  if (file.size > MAX_BYTES) {
    toast.error('File vượt quá 10MB');
    return false;
  }
  return true;
}

/* ─────────────────────────── page ────────────────────────────── */

function CustomerProfilePage() {
  const user = useAuthStore((s) => s.user);
  const username = user?.username ?? '—';
  const userId = user?.id ?? '—';

  const ownerQuery = useGetMyOwnerProfile();
  const updateOwner = useUpdateMyOwnerProfile();
  const uploadAvatar = useUploadMyOwnerAvatar();
  const deleteAvatar = useDeleteMyOwnerAvatar();

  const invalidateOwner = () => ownerQuery.refetch();
  const serverAvatarUrl = ownerQuery.data?.avatarUrl;

  /* ── avatar (deferred, edited inline) ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropRef = useRef<AvatarCropHandle>(null);
  /** Picked file being cropped inline. Null = show the current/server avatar. */
  const [cropSource, setCropSource] = useState<File | null>(null);

  /** A picked file opens the inline crop editor inside the form. */
  function handleFilePicked(file: File) {
    if (!validateFile(file)) return;
    setCropSource(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearPendingAvatar() {
    setCropSource(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /* ── contact form ── */
  const [ownerForm, setOwnerForm] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    telephone: '',
  });
  const [fieldDirty, setFieldDirty] = useState(false);
  /** True when either a field has changed OR a new avatar is queued */
  const dirty = fieldDirty || !!cropSource;

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
    setFieldDirty(false);
  }, [ownerQuery.data]);

  const setField = (k: keyof typeof ownerForm) => (v: string) => {
    setOwnerForm((p) => ({ ...p, [k]: v }));
    setFieldDirty(true);
  };

  /* ── submit: upload avatar (if pending) + update profile ── */
  const isSaving =
    updateOwner.isPending || uploadAvatar.isPending || deleteAvatar.isPending;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerForm.firstName.trim() || !ownerForm.lastName.trim()) {
      toast.error('Họ và tên không được trống');
      return;
    }

    try {
      // render the inline crop to a File at save time, then upload in parallel
      const avatarFile = cropSource ? await cropRef.current?.getCroppedFile() : null;
      await Promise.all([
        updateOwner.mutateAsync({ data: ownerForm }),
        avatarFile
          ? uploadAvatar.mutateAsync({ data: { file: avatarFile } })
          : Promise.resolve(),
      ]);

      toast.success('Đã lưu hồ sơ');
      setFieldDirty(false);
      setCropSource(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      void invalidateOwner();
    } catch (err) {
      toast.error((err as Error).message || 'Lưu thất bại');
    }
  };
  const ownerName = ownerQuery.data
    ? `${ownerQuery.data.firstName ?? ''} ${ownerQuery.data.lastName ?? ''}`.trim()
    : username;

  const profileLoading = ownerQuery.isLoading;

  return (
    <>
      <ProfilePageHeader
        title="Hồ sơ của tôi"
        subtitle="Quản lý thông tin tài khoản, liên hệ và bảo mật."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* ── Read-only account info ── */}
          <ProfileCard>
            <CardTitleRow
              icon={UserCircle2}
              title="Thông tin tài khoản"
              description="Một số mục dưới đây thuộc về tài khoản đăng nhập, không sửa trực tiếp."
            />

            <div className="mt-6 divide-y divide-border border-t border-border">
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

          {/* ── Editable profile: avatar + contact fields ── */}
          <ProfileCard>
            <CardTitleRow
              icon={AtSign}
              title="Cập nhật hồ sơ"
              description="Ảnh đại diện và thông tin liên hệ — bấm Lưu để xác nhận tất cả thay đổi."
            />

            {profileLoading ? (
              <div className="mt-6 space-y-4">
                {/* avatar skeleton */}
                <div className="flex items-center gap-4">
                  <Skeleton className="size-20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                {/* ── Avatar: inline crop editor when picking, else current avatar ── */}
                {cropSource ? (
                  <div className="flex flex-col gap-5 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-start">
                    {/* Inline crop / preview — adjust right inside the form */}
                    <AvatarCropField ref={cropRef} file={cropSource} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-foreground">
                        {ownerName}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">
                        <span className="size-1.5 rounded-full bg-warning" />
                        Ảnh mới — bấm “Lưu thay đổi” để cập nhật
                      </span>

                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        Kéo ảnh để di chuyển, dùng thanh trượt hoặc lăn chuột để phóng to.
                        Phần bên trong vòng tròn sẽ là ảnh đại diện của bạn.
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold"
                        >
                          <Camera className="size-3.5" />
                          Đổi ảnh khác
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={clearPendingAvatar}
                          className="text-xs font-bold text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          Huỷ chọn
                        </Button>
                      </div>

                      <p className="mt-2 text-[10px] text-muted-foreground">
                        JPEG / PNG / WebP, tối đa 10&nbsp;MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-5 rounded-xl border border-border bg-muted/30 p-4">
                    {/* Current avatar circle */}
                    <div className="relative shrink-0">
                      <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-card via-accent to-primary/20 text-primary shadow-sm ring-4 ring-background">
                        {serverAvatarUrl ? (
                          <img
                            src={serverAvatarUrl}
                            alt="Ảnh đại diện"
                            className="size-full object-cover"
                          />
                        ) : (
                          <UserCircle2 className="size-14" />
                        )}
                      </div>

                      {/* Camera button overlay */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90"
                      >
                        <Camera className="size-3.5" />
                      </button>
                    </div>

                    {/* Info + actions */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-foreground">
                        {ownerName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(user?.roles?.length ? user.roles : ['USER']).map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 text-[10px] font-black text-primary"
                          >
                            <ShieldCheck className="size-3" /> {role}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold"
                        >
                          <Camera className="size-3.5" />
                          Đổi ảnh
                        </Button>

                        {serverAvatarUrl && (
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            disabled={deleteAvatar.isPending}
                            onClick={() =>
                              deleteAvatar.mutate(undefined, {
                                onSuccess: () => {
                                  toast.success('Đã xoá ảnh đại diện');
                                  void invalidateOwner();
                                },
                                onError: (err) =>
                                  toast.error(
                                    (err as Error).message || 'Xoá ảnh thất bại',
                                  ),
                              })
                            }
                            className="text-xs font-bold text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Xoá ảnh
                          </Button>
                        )}
                      </div>

                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        JPEG / PNG / WebP, tối đa 10&nbsp;MB
                      </p>
                    </div>
                  </div>
                )}

                {/* Hidden file input (shared) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED.join(',')}
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFilePicked(file);
                  }}
                />

                {/* Section label */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
                    Thông tin liên hệ
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* ── Contact fields ── */}
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
                    placeholder="Hồ Chí Minh"
                    leadingIcon={MapPin}
                  />
                </div>
                <FormField
                  id="profile-address"
                  label="Địa chỉ"
                  value={ownerForm.address}
                  onChange={setField('address')}
                  placeholder="Số nhà, đường, phường/xã"
                  leadingIcon={MapPin}
                />

                {/* ── Footer ── */}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  {dirty ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                      <span className="size-1.5 rounded-full bg-warning" />
                      Có thay đổi chưa lưu
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <span className="size-1.5 rounded-full bg-success" />
                      Đồng bộ với hệ thống
                    </span>
                  )}
                  <Button
                    type="submit"
                    className="h-10 rounded-xl font-black"
                    disabled={!dirty || isSaving}
                  >
                    {isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            )}
          </ProfileCard>
        </div>

        {/* Right column — security + quick links */}
        <div className="space-y-6">
          <ProfileCard>
            <CardTitleRow
              icon={ShieldCheck}
              title="Bảo vệ tài khoản"
              description="Thực hiện các bước sau để giữ thông tin an toàn."
            />
            <ul className="mt-5 space-y-3 text-sm font-medium text-muted-foreground">
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

          <ProfileCard className="bg-gradient-to-br from-accent via-accent/40 to-card">
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

/* ─────────────────────── sub-components ──────────────────────── */

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
      <Label htmlFor={id} className="text-[11px] font-black text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {LeadingIcon ? (
          <LeadingIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('h-10 text-sm font-semibold', LeadingIcon && 'pl-9')}
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
    <div className="grid gap-3 rounded-xl py-3.5 transition-colors hover:bg-muted/50 sm:grid-cols-[24px_1fr_auto] sm:items-center sm:px-2">
      <Icon className="hidden size-4 text-muted-foreground sm:block" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p
          className={cn(
            'mt-1 text-sm font-semibold break-words text-foreground',
            mono && 'font-mono text-xs',
          )}
        >
          {value}
        </p>
      </div>
      {lockedTooltip ? (
        <span
          title={lockedTooltip}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-bold text-warning"
        >
          <Lock className="size-3.5" /> Sẽ có sau
        </span>
      ) : action ? (
        <Button
          variant="outline"
          size="xs"
          onClick={onAction}
          className="w-fit text-xs font-black"
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
    <li className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="min-w-0">
        <p className="text-sm font-black text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 font-medium text-muted-foreground">
          {description}
        </p>
      </div>
      <Button asChild size="xs" variant="outline" className="shrink-0 text-xs font-black">
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
      className="flex h-11 items-center justify-between rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
    >
      <span>{label}</span>
      <span aria-hidden className="text-primary">
        →
      </span>
    </Link>
  );
}
