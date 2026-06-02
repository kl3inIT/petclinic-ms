import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Award,
  CalendarClock,
  Camera,
  CreditCard,
  Eye,
  FileText,
  GraduationCap,
  IdCard,
  LockKeyhole,
  Mail,
  MessageSquareQuote,
  Phone,
  QrCode,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Trash2,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/features/auth/store';
import {
  useDeleteMyPhoto,
  useMyBadges,
  useMyPhoto,
  useMyProfile,
  useMyRatingsSummary,
  useMySchedule,
  useUpdateMyProfile,
  useUploadMyPhoto,
} from '@/features/vet-me/api';
import { MediaUploader } from '@/features/vets/components/MediaUploader';
import { useListVetEducations } from '@/lib/api/generated/vet-educations/vet-educations';
import type { EducationResponse } from '@/lib/api/generated/model';
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
  const [idCardOpen, setIdCardOpen] = useState(false);

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
        phoneNumber: profile?.phoneNumber ?? '',
        resume: profile?.resume ?? '',
      };
      const v = {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phoneNumber: value.phoneNumber.trim(),
        resume: value.resume.trim(),
      };

      const data: Record<string, string | undefined> = {};
      if (v.firstName !== orig.firstName) data.firstName = v.firstName;
      if (v.lastName !== orig.lastName) data.lastName = v.lastName;
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
  const profileLoading = profileQuery.isLoading || profileQuery.isError;

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

  return (
    <div className="space-y-6 pb-24">
      <CoverHero
        loading={profileLoading}
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
          <AvatarSection firstName={profile?.firstName} lastName={profile?.lastName} />

          <SectionCard
            icon={IdCard}
            title="Thẻ bác sĩ"
            subtitle="Thông tin định danh nội bộ"
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  'gap-1.5 rounded-lg border-violet-200 transition-colors',
                  idCardOpen
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-white text-violet-700 hover:bg-violet-50',
                )}
                onClick={() => setIdCardOpen((v) => !v)}
                disabled={profileLoading || !profile}
              >
                <CreditCard className="size-3.5" />
                {idCardOpen ? 'Ẩn thẻ' : 'Xem thẻ'}
              </Button>
            }
          >
            {profileLoading ? (
              <IdSkeleton />
            ) : (
              <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                <DefRow
                  label="Mã bác sĩ"
                  value={profile?.id ? `#${profile.id}` : '—'}
                  mono
                />
                <DefRow label="Mã thẻ" value={profile?.cardCode ?? '—'} mono />
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
            {profileLoading ? (
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
                        hint="Đổi email sẽ phát hành sau (workflow xác thực qua mã OTP). Liên hệ admin nếu cần đổi gấp."
                        icon={Mail}
                      >
                        <div className="relative">
                          <Input
                            id={field.name}
                            type="email"
                            value={field.state.value}
                            readOnly
                            tabIndex={-1}
                            placeholder="ten.vet@petclinic.local"
                            className="h-11 cursor-not-allowed bg-slate-50 pr-10 text-slate-600"
                          />
                          <span
                            title="Đổi email sẽ phát hành sau"
                            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400"
                          >
                            <LockKeyhole className="size-4" />
                          </span>
                        </div>
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

      <EducationSection vetId={profile?.id} />

      {hydrated && (
        <StickyActionBar
          dirty={isDirty}
          saving={updateMutation.isPending}
          onReset={resetForm}
          onSave={() => void form.handleSubmit()}
        />
      )}

      <VetIdCardDialog
        open={idCardOpen}
        onOpenChange={setIdCardOpen}
        profile={profile}
        username={username}
        fullName={fullName}
      />
    </div>
  );
}

const PHOTO_STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Đang chờ STAFF duyệt',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  APPROVED: {
    label: 'Đã duyệt — hiển thị công khai',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Bị từ chối',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

function AvatarSection({
  firstName,
  lastName,
}: {
  firstName?: string;
  lastName?: string;
}) {
  const photoQuery = useMyPhoto();
  const uploadMutation = useUploadMyPhoto();
  const deleteMutation = useDeleteMyPhoto();

  const photo = photoQuery.data;
  const presignedUrl = photo?.presignedUrl ?? null;
  const status = photo?.status;
  const statusMeta = status ? PHOTO_STATUS_META[status] : undefined;

  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => toast.success('Đã xóa ảnh đại diện'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Xóa ảnh thất bại'),
    });
  }

  return (
    <SectionCard
      icon={Camera}
      title="Ảnh đại diện"
      subtitle="Tải lên ảnh chân dung — hiển thị ở hồ sơ công khai sau khi được duyệt"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          {photoQuery.isLoading ? (
            <Skeleton className="size-24 rounded-full" />
          ) : presignedUrl ? (
            <img
              src={presignedUrl}
              alt="Ảnh đại diện"
              className="size-24 rounded-full object-cover ring-2 ring-violet-100"
            />
          ) : (
            <VetAvatar firstName={firstName} lastName={lastName} size="lg" />
          )}
          {presignedUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
              Xóa ảnh
            </Button>
          )}
        </div>

        <div className="w-full flex-1 space-y-2">
          <MediaUploader
            label="Tải / đổi ảnh đại diện"
            busy={uploadMutation.isPending}
            onUpload={(file) =>
              uploadMutation
                .mutateAsync({ data: { file } })
                .then(() => toast.success('Đã tải ảnh — chờ STAFF duyệt'))
                .catch((e: unknown) => {
                  toast.error(e instanceof Error ? e.message : 'Tải ảnh thất bại');
                  throw e;
                })
            }
          />
          {statusMeta && (
            <div className="space-y-1">
              <Badge
                variant="outline"
                className={cn('rounded-full px-2.5 py-0.5 text-xs', statusMeta.className)}
              >
                {statusMeta.label}
              </Badge>
              {status === 'REJECTED' && photo?.rejectReason && (
                <p className="text-xs text-rose-600">Lý do: {photo.rejectReason}</p>
              )}
            </div>
          )}
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
            Mỗi lần đổi ảnh sẽ cần STAFF/quản trị viên duyệt lại trước khi hiển thị cho
            khách hàng.
          </p>
        </div>
      </div>
    </SectionCard>
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

function EducationSection({ vetId }: { vetId: number | undefined }) {
  const { data, isLoading, isError } = useListVetEducations(
    vetId ?? 0,
    { pageable: { page: 0, size: 50, sort: ['startDate,desc'] } },
    { query: { enabled: vetId != null } },
  );

  const items: EducationResponse[] = data?.content ?? [];

  return (
    <SectionCard
      icon={GraduationCap}
      title="Học vấn & bằng cấp"
      subtitle="Trình độ học vấn hiển thị ở trang chi tiết bác sĩ"
      action={
        <Badge
          variant="outline"
          className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-700 uppercase"
        >
          Chỉnh sửa qua admin
        </Badge>
      }
    >
      {vetId == null || isLoading || isError ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <GraduationCap className="mx-auto size-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-600">
            Chưa có bằng cấp nào được ghi nhận
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Liên hệ quản trị viên / staff để bổ sung trường, ngành, bằng cấp vào hồ sơ.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((edu) => (
            <EducationRow key={edu.id} edu={edu} />
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
        <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Bằng cấp do quản trị viên / staff xác minh và cập nhật.{' '}
          <span className="font-semibold text-slate-600">
            Tính năng tự cập nhật học vấn sắp ra mắt
          </span>{' '}
          (chờ endpoint{' '}
          <code className="rounded bg-slate-100 px-1">vet-me/educations</code> từ
          backend).
        </span>
      </p>
    </SectionCard>
  );
}

function EducationRow({ edu }: { edu: EducationResponse }) {
  const start = formatYearMonth(edu.startDate);
  const end = formatYearMonth(edu.endDate) ?? 'Hiện tại';
  const range = start ? `${start} – ${end}` : end;
  return (
    <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/30">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
        <GraduationCap className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-950">
          {edu.degree || 'Bằng cấp'}
          {edu.fieldOfStudy && (
            <span className="font-medium text-slate-600"> · {edu.fieldOfStudy}</span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-600">{edu.schoolName ?? '—'}</p>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500">
          {range}
        </p>
      </div>
    </li>
  );
}

function formatYearMonth(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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

interface VetIdCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ReturnType<typeof useMyProfile>['data'];
  username: string;
  fullName: string;
}

function VetIdCardDialog({
  open,
  onOpenChange,
  profile,
  username,
  fullName,
}: VetIdCardDialogProps) {
  const issuedYear = new Date().getFullYear();
  // cardCode do BE sinh tự động qua Postgres GENERATED column (xem changeset
  // 012-add-vet-card-code.yaml + Vet.cardCode @Generated). Format `PC-VET-{LPAD(id,4)}`.
  // Fallback chỉ chạy khi profile chưa load.
  const cardCode =
    profile?.cardCode ??
    (profile?.id != null
      ? `PC-VET-${String(profile.id).padStart(4, '0')}`
      : 'PC-VET-----');
  const specialtyNames = (profile?.specialties ?? [])
    .map((s) => s.name)
    .filter(Boolean) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] overflow-hidden border-none bg-transparent p-0 shadow-none [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Thẻ bác sĩ</DialogTitle>
          <DialogDescription>
            Thẻ ra vào nội bộ Petclinic — chỉ dùng trong khuôn viên phòng khám.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center">
          {/* Lanyard ribbon */}
          <div className="flex h-12 w-24 items-end justify-center">
            <div className="h-full w-3 rounded-t bg-gradient-to-b from-violet-700 to-violet-500 shadow-inner" />
            <div className="h-full w-3 rounded-t bg-gradient-to-b from-violet-500 to-violet-700 shadow-inner" />
          </div>

          {/* Clip */}
          <div className="-mt-1 flex items-center justify-center">
            <div className="h-3 w-16 rounded-t-md bg-slate-800" />
          </div>

          {/* Card body */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_25px_60px_-15px_rgba(124,108,245,0.45)]">
            {/* Hole punch */}
            <div className="absolute top-3 left-1/2 z-10 size-4 -translate-x-1/2 rounded-full border border-slate-300 bg-slate-100 shadow-inner" />

            {/* Header band */}
            <div className="relative bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-5 pt-9 pb-4 text-white">
              <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 size-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                  <Stethoscope className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-violet-100 uppercase">
                    Petclinic
                  </p>
                  <p className="text-sm font-extrabold tracking-wide">MEDICAL STAFF</p>
                </div>
              </div>
            </div>

            {/* Diagonal stripe */}
            <div className="h-2 bg-[repeating-linear-gradient(135deg,_#7c3aed_0_10px,_#a855f7_10px_20px)]" />

            {/* Body */}
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-1 ring-2 ring-violet-200">
                  <VetAvatar
                    firstName={profile?.firstName}
                    lastName={profile?.lastName}
                    photoUrl={profile?.photoUrl ?? null}
                    size="lg"
                    className="rounded-lg"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                    Bác sĩ thú y
                  </p>
                  <p className="truncate text-lg leading-tight font-extrabold text-slate-950">
                    {fullName || 'Chưa có tên'}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                    {username}
                  </p>
                </div>
              </div>

              {specialtyNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {specialtyNames.slice(0, 4).map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700"
                    >
                      <Sparkles className="size-2.5" />
                      {name}
                    </span>
                  ))}
                  {specialtyNames.length > 4 && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      +{specialtyNames.length - 4}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                <div className="space-y-1.5 text-left">
                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                      Mã thẻ
                    </p>
                    <p className="font-mono text-sm font-extrabold text-slate-950">
                      {cardCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                      Tình trạng
                    </p>
                    <p className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                      <ShieldCheck
                        className={cn(
                          'size-3',
                          profile?.active ? 'text-emerald-600' : 'text-slate-400',
                        )}
                      />
                      {profile?.active ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </p>
                  </div>
                </div>
                <div className="flex size-16 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm">
                  <QrCode className="size-12" />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-[10px] font-semibold text-slate-500">
                <span>Cấp năm {issuedYear}</span>
                <span>Giá trị đến {issuedYear + 2}</span>
              </div>
            </div>

            {/* Footer band */}
            <div className="bg-slate-950 px-5 py-2.5 text-center">
              <p className="text-[9px] font-bold tracking-[0.25em] text-slate-300 uppercase">
                Petclinic Internal · Authorized Personnel Only
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-[320px] text-center text-[11px] font-medium text-slate-500">
            Thẻ định danh nội bộ — vui lòng mang theo khi vào khu vực điều trị. Mất thẻ
            báo lễ tân để cấp lại.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
