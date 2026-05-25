import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Award,
  CalendarClock,
  Eye,
  FileText,
  IdCard,
  Info,
  LockKeyhole,
  Mail,
  MessageSquareQuote,
  Phone,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Stethoscope,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/features/auth/store';
import {
  useMyBadges,
  useMyProfile,
  useMyRatingsSummary,
  useMySchedule,
  useUpdateMyProfile,
} from '@/features/vet-me/api';
import { CircleProgress } from '@/features/vet-me/components/charts/CircleProgress';
import { StarRating } from '@/features/vet-me/components/StarRating';
import { VetAvatar } from '@/features/vet-me/components/VetAvatar';
import { FieldError } from '@/lib/form/FieldError';
import { cn } from '@/lib/utils';

const profileFormSchema = z.object({
  firstName: z.string().max(255, 'Tối đa 255 ký tự'),
  lastName: z.string().max(255, 'Tối đa 255 ký tự'),
  email: z
    .string()
    .max(255)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Email không hợp lệ',
    }),
  phoneNumber: z.string().max(30, 'Tối đa 30 ký tự'),
  resume: z.string().max(10_000, 'Tối đa 10000 ký tự'),
});

export const Route = createFileRoute('/vet/profile')({
  component: VetProfilePage,
});

function VetProfilePage() {
  const username = useAuthStore((s) => s.user?.username) ?? '—';
  const profileQuery = useMyProfile();
  const updateMutation = useUpdateMyProfile();
  const ratingsSummaryQuery = useMyRatingsSummary();
  const badgesQuery = useMyBadges(0, 1);
  const scheduleQuery = useMySchedule();

  const formDefaults = useMemo(
    () => ({
      firstName: profileQuery.data?.firstName ?? '',
      lastName: profileQuery.data?.lastName ?? '',
      email: profileQuery.data?.email ?? '',
      phoneNumber: profileQuery.data?.phoneNumber ?? '',
      resume: profileQuery.data?.resume ?? '',
    }),
    [profileQuery.data],
  );

  const form = useForm({
    defaultValues: formDefaults,
    validators: { onChange: profileFormSchema },
    onSubmit: ({ value }) => {
      const orig = {
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
        email: profile?.email ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
        resume: profile?.resume ?? '',
      };
      const v = {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        phoneNumber: value.phoneNumber.trim(),
        resume: value.resume.trim(),
      };

      const data: Record<string, string | undefined> = {};
      if (v.firstName !== orig.firstName) data.firstName = v.firstName;
      if (v.lastName !== orig.lastName) data.lastName = v.lastName;
      if (v.email !== orig.email) data.email = v.email;
      if (v.phoneNumber !== orig.phoneNumber) data.phoneNumber = v.phoneNumber;
      if (v.resume !== orig.resume) data.resume = v.resume;

      if (Object.keys(data).length === 0) {
        toast.info('Không có thay đổi nào để lưu');
        return;
      }

      updateMutation.mutate(
        { data },
        {
          onSuccess: () => toast.success('Đã cập nhật hồ sơ'),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại'),
        },
      );
    },
  });

  const hydrated = profileQuery.data != null;

  const profile = profileQuery.data;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const scheduleCount = scheduleQuery.data?.length ?? 0;
  const badgeCount = badgesQuery.data?.totalElements ?? 0;
  const ratingAvg = ratingsSummaryQuery.data?.average;
  const ratingCount = ratingsSummaryQuery.data?.count ?? 0;
  const formValues = useStore(form.store, (s) => s.values);
  const isDirty = useMemo(() => {
    if (!profile || !hydrated) return false;
    return (
      formValues.firstName.trim() !== (profile.firstName ?? '') ||
      formValues.lastName.trim() !== (profile.lastName ?? '') ||
      formValues.email.trim() !== (profile.email ?? '') ||
      formValues.phoneNumber.trim() !== (profile.phoneNumber ?? '') ||
      formValues.resume.trim() !== (profile.resume ?? '')
    );
  }, [profile, hydrated, formValues]);

  function resetForm() {
    if (profile) {
      form.reset({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        email: profile.email ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        resume: profile.resume ?? '',
      });
    }
  }

  if (profileQuery.isError) {
    return (
      <Card className="border-destructive/30 bg-white shadow-sm">
        <CardContent className="flex items-start gap-3 p-6 text-sm text-destructive">
          <Info className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Không tải được hồ sơ bác sĩ.</p>
            <p className="mt-1 text-destructive/80">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : 'Vui lòng thử lại sau.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <CoverHero
        loading={profileQuery.isLoading}
        profile={profile}
        username={username}
        fullName={fullName}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        scheduleCount={scheduleCount}
        badgeCount={badgeCount}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          <SectionCard
            icon={IdCard}
            title="Thẻ bác sĩ"
            subtitle="Thông tin định danh nội bộ"
          >
            {profileQuery.isLoading ? (
              <IdSkeleton />
            ) : (
              <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                <DefRow
                  label="Mã bác sĩ"
                  value={profile?.id ? `#${profile.id}` : '—'}
                  mono
                />
                <DefRow label="Tên đăng nhập" value={username} mono />
                <DefRow
                  label="Trạng thái"
                  value={<StatusPill active={profile?.active} />}
                />
                <DefRow
                  label="Tổng chuyên khoa"
                  value={`${profile?.specialties?.length ?? 0} chuyên khoa`}
                />
              </dl>
            )}
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <LockKeyhole className="size-3.5 shrink-0" />
              Mã, trạng thái và chuyên khoa do quản trị viên gán. Liên hệ admin nếu cần
              thay đổi.
            </p>
          </SectionCard>

          <SectionCard
            icon={Stethoscope}
            title="Chuyên khoa"
            subtitle="Lĩnh vực điều trị bạn được cấp"
          >
            {profileQuery.isLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            ) : (profile?.specialties ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
                Chưa có chuyên khoa nào được gán.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile?.specialties?.map((s) => (
                  <Badge
                    key={s.id ?? s.name}
                    className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-none hover:bg-violet-100"
                  >
                    <Sparkles className="size-3" />
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={Award}
            title="Tóm tắt hoạt động"
            subtitle="Snapshot dữ liệu chuyên môn"
          >
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={Star}
                tone="amber"
                label="Điểm TB"
                value={ratingAvg == null ? '—' : ratingAvg.toFixed(2)}
                hint={`${ratingCount} lượt`}
                loading={ratingsSummaryQuery.isLoading}
              />
              <StatTile
                icon={MessageSquareQuote}
                tone="indigo"
                label="Đánh giá"
                value={String(ratingCount)}
                hint="Tổng lượt"
                loading={ratingsSummaryQuery.isLoading}
              />
              <StatTile
                icon={CalendarClock}
                tone="emerald"
                label="Khung trực"
                value={String(scheduleCount)}
                hint="Tuần này"
                loading={scheduleQuery.isLoading}
              />
              <StatTile
                icon={Award}
                tone="violet"
                label="Huy hiệu"
                value={String(badgeCount)}
                hint="Đã đạt"
                loading={badgesQuery.isLoading}
              />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          {hydrated && (
            <PublicPreviewCard
              firstName={formValues.firstName}
              lastName={formValues.lastName}
              photoUrl={profile?.photoUrl ?? null}
              specialties={profile?.specialties ?? []}
              ratingAvg={ratingAvg}
              ratingCount={ratingCount}
              resume={formValues.resume}
              email={formValues.email}
              phoneNumber={formValues.phoneNumber}
            />
          )}

          <SectionCard
            icon={UserCircle}
            title="Chỉnh sửa hồ sơ"
            subtitle="Thay đổi sẽ áp dụng ngay sau khi lưu. Để trống = giữ nguyên với họ/tên/email; với phone/tiểu sử = xoá."
          >
            {!hydrated ? (
              <FormSkeleton />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void form.handleSubmit();
                }}
                className="space-y-6"
              >
                <FieldGroup title="Họ và tên" icon={UserCircle}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <form.Field
                      name="firstName"
                      children={(field) => (
                        <Field label="Tên" name={field.name}>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Thanh"
                            className="h-11"
                          />
                          <FieldError field={field} />
                        </Field>
                      )}
                    />
                    <form.Field
                      name="lastName"
                      children={(field) => (
                        <Field label="Họ" name={field.name}>
                          <Input
                            id={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Nguyễn"
                            className="h-11"
                          />
                          <FieldError field={field} />
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup title="Liên hệ" icon={Mail}>
                  <form.Field
                    name="email"
                    children={(field) => (
                      <Field
                        label="Email"
                        name={field.name}
                        hint="Phải duy nhất. Ảnh hưởng tới hoá đơn và lịch hẹn."
                        icon={Mail}
                      >
                        <Input
                          id={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="ten.vet@petclinic.local"
                          className="h-11"
                        />
                        <FieldError field={field} />
                      </Field>
                    )}
                  />
                  <form.Field
                    name="phoneNumber"
                    children={(field) => (
                      <Field
                        label="Số điện thoại"
                        name={field.name}
                        hint="Khách hàng có thể thấy số này. Để trống = xoá."
                        icon={Phone}
                      >
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="0901000001"
                          className="h-11"
                        />
                        <FieldError field={field} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                <FieldGroup title="Tiểu sử nghề nghiệp" icon={FileText}>
                  <form.Field
                    name="resume"
                    children={(field) => (
                      <Field
                        label="Mô tả về bạn"
                        name={field.name}
                        hint={`${field.state.value.length}/10000 ký tự • Hiển thị ở trang chi tiết bác sĩ.`}
                      >
                        <Textarea
                          id={field.name}
                          rows={8}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Mô tả kinh nghiệm, chứng chỉ, lĩnh vực chuyên sâu, năm tốt nghiệp..."
                          className="min-h-44 rounded-md border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-violet-300"
                        />
                        <FieldError field={field} />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            )}
          </SectionCard>
        </div>
      </div>

      {hydrated && (
        <StickyActionBar
          dirty={isDirty}
          saving={updateMutation.isPending}
          onReset={resetForm}
          onSave={() => void form.handleSubmit()}
        />
      )}
    </div>
  );
}

interface CoverHeroProps {
  loading: boolean;
  profile: ReturnType<typeof useMyProfile>['data'];
  username: string;
  fullName: string;
  ratingAvg?: number;
  ratingCount: number;
  scheduleCount: number;
  badgeCount: number;
}

function CoverHero({
  loading,
  profile,
  username,
  fullName,
  ratingAvg,
  ratingCount,
  scheduleCount,
  badgeCount,
}: CoverHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="relative h-32 bg-gradient-to-r from-violet-500 via-violet-400 to-rose-300 sm:h-36">
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 600 100" className="size-full" preserveAspectRatio="none">
            <path
              d="M0,60 C150,20 300,80 450,40 C525,20 600,60 600,60 L600,100 L0,100 Z"
              fill="white"
              opacity="0.3"
            />
          </svg>
        </div>
        <Badge className="absolute top-4 right-4 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm backdrop-blur">
          Vet Portal • Hồ sơ
        </Badge>
      </div>

      <div className="relative -mt-12 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:gap-6 sm:px-8 sm:pb-6">
        {loading ? (
          <Skeleton className="size-28 rounded-full ring-4 ring-white" />
        ) : (
          <VetAvatar
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            photoUrl={profile?.photoUrl}
            size="xl"
            ring
          />
        )}
        <div className="min-w-0 flex-1 pt-2 sm:pt-0">
          <h1 className="truncate text-2xl leading-tight font-bold text-slate-950 sm:text-3xl">
            BS. {loading ? '...' : fullName || username}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span className="font-mono text-xs text-slate-500">
              #{profile?.id ?? '—'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{username}</span>
            <span className="text-slate-300">•</span>
            <StatusPill active={profile?.active} compact />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-4">
          <HeroStat
            label="Điểm TB"
            value={ratingAvg == null ? '—' : ratingAvg.toFixed(1)}
            hint={`${ratingCount} lượt`}
          />
          <HeroStat label="Khung trực" value={String(scheduleCount)} hint="tuần này" />
          <HeroStat label="Huy hiệu" value={String(badgeCount)} hint="đã đạt" />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-center shadow-sm sm:min-w-24 sm:text-left">
      <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-xl leading-none font-bold text-slate-950 tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

interface PublicPreviewCardProps {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  specialties: { id?: number; name?: string }[];
  ratingAvg?: number;
  ratingCount: number;
  resume: string;
  email: string;
  phoneNumber: string;
}

function PublicPreviewCard({
  firstName,
  lastName,
  photoUrl,
  specialties,
  ratingAvg,
  ratingCount,
  resume,
  email,
  phoneNumber,
}: PublicPreviewCardProps) {
  const fullName = `${firstName} ${lastName}`.trim() || 'Chưa có tên';
  return (
    <SectionCard
      icon={Eye}
      title="Xem trước hồ sơ công khai"
      subtitle="Khách hàng sẽ thấy như thế này khi xem chi tiết bác sĩ"
      action={
        <Badge
          variant="outline"
          className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-700 uppercase"
        >
          Live preview
        </Badge>
      }
    >
      <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/40 via-white to-rose-50/30 p-5">
        <div className="flex items-start gap-4">
          <VetAvatar
            firstName={firstName}
            lastName={lastName}
            photoUrl={photoUrl}
            size="lg"
            ring
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold text-slate-950">
              BS. {fullName}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <StarRating score={Math.round(ratingAvg ?? 0)} size="sm" />
              <span className="text-xs text-slate-500">
                {ratingAvg == null ? '—' : ratingAvg.toFixed(1)} ({ratingCount} đánh giá)
              </span>
            </div>
            {specialties.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {specialties.slice(0, 4).map((s) => (
                  <span
                    key={s.id ?? s.name}
                    className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {resume && (
          <p className="mt-4 line-clamp-4 text-sm leading-6 whitespace-pre-line text-slate-600">
            {resume}
          </p>
        )}
        {!resume && (
          <p className="mt-4 text-sm text-slate-400 italic">
            Chưa có tiểu sử — hãy bổ sung để khách hàng hiểu rõ về bạn hơn.
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-violet-100 pt-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="size-3.5 text-violet-500" />
            <span className="truncate">{email || 'Chưa cập nhật email'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone className="size-3.5 text-violet-500" />
            <span className="truncate">{phoneNumber || 'Chưa cập nhật SĐT'}</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function StickyActionBar({
  dirty,
  saving,
  onReset,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 transition-all duration-200 sm:px-6',
        dirty ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-full border border-violet-200 bg-white/95 px-5 py-2.5 shadow-lg ring-1 ring-violet-100 backdrop-blur">
        <div className="flex items-center gap-2 text-sm">
          <CircleProgress
            size={28}
            strokeWidth={3}
            value={1}
            max={1}
            progressClassName="stroke-amber-500"
            trackClassName="stroke-amber-100"
          />
          <span className="font-semibold text-slate-700">Có thay đổi chưa được lưu</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            className="text-slate-500 hover:text-slate-800"
            onClick={onReset}
          >
            <RotateCcw className="size-4" />
            Khôi phục
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            className="bg-violet-600 text-white hover:bg-violet-700"
            onClick={onSave}
          >
            <Save className="size-4" />
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
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
  action?: React.ReactNode;
  children: React.ReactNode;
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

function FieldGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/40 p-4">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-600 uppercase">
        <Icon className="size-3.5 text-violet-600" />
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={name}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700"
      >
        {Icon && <Icon className="size-3.5 text-violet-600" />}
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function DefRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-sm">
      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 truncate font-medium text-slate-900',
          mono && 'font-mono text-slate-700',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPill({ active, compact }: { active?: boolean; compact?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
        compact && 'py-0',
      )}
    >
      <span
        className={cn(
          'mr-1.5 size-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-slate-400',
        )}
      />
      {active ? 'Đang hoạt động' : 'Tạm nghỉ'}
    </Badge>
  );
}

const STAT_TONE = {
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
} as const;

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  tone: keyof typeof STAT_TONE;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-md p-1.5', STAT_TONE[tone])}>
          <Icon className="size-3.5" />
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-12" />
      ) : (
        <p className="mt-1.5 text-xl font-bold text-slate-950 tabular-nums">{value}</p>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function IdSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
