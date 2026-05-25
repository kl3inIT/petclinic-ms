import { useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Award,
  CalendarClock,
  Info,
  LockKeyhole,
  Mail,
  MessageSquareQuote,
  Pencil,
  Phone,
  RotateCcw,
  Save,
  Star,
  Stethoscope,
  User,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useMyBadges,
  useMyProfile,
  useMyRatingsSummary,
  useMySchedule,
  useUpdateMyProfile,
} from '@/features/vet-me/api';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import { FieldError } from '@/lib/form/FieldError';
import { cn } from '@/lib/utils';

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'Bắt buộc').max(255, 'Tối đa 255 ký tự'),
  lastName: z.string().min(1, 'Bắt buộc').max(255, 'Tối đa 255 ký tự'),
  email: z.string().min(1, 'Bắt buộc').email('Email không hợp lệ').max(255),
  phoneNumber: z.string().max(30, 'Tối đa 30 ký tự'),
  resume: z.string().max(10_000, 'Tối đa 10000 ký tự'),
});

export const Route = createFileRoute('/vet/profile')({
  component: VetProfilePage,
});

function VetProfilePage() {
  const profileQuery = useMyProfile();
  const updateMutation = useUpdateMyProfile();
  const ratingsSummaryQuery = useMyRatingsSummary();
  const badgesQuery = useMyBadges(0, 1);
  const scheduleQuery = useMySchedule();

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      resume: '',
    },
    validators: { onChange: profileFormSchema },
    onSubmit: ({ value }) =>
      updateMutation.mutate(
        {
          data: {
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            email: value.email.trim(),
            phoneNumber: value.phoneNumber.trim(),
            resume: value.resume.trim(),
          },
        },
        {
          onSuccess: () => toast.success('Đã cập nhật hồ sơ'),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại'),
        },
      ),
  });

  // hydrate-once qua ref guard — tránh form reset overwrite user typing.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (profileQuery.data && !hydratedRef.current) {
      form.reset({
        firstName: profileQuery.data.firstName ?? '',
        lastName: profileQuery.data.lastName ?? '',
        email: profileQuery.data.email ?? '',
        phoneNumber: profileQuery.data.phoneNumber ?? '',
        resume: profileQuery.data.resume ?? '',
      });
      hydratedRef.current = true;
    }
  }, [profileQuery.data, form]);

  const profile = profileQuery.data;
  const initials = getInitials(profile?.firstName, profile?.lastName);
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const scheduleCount = scheduleQuery.data?.length ?? 0;
  const badgeCount = badgesQuery.data?.totalElements ?? 0;
  const ratingAvg = ratingsSummaryQuery.data?.average;
  const ratingCount = ratingsSummaryQuery.data?.count ?? 0;

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
    <div className="relative space-y-5 overflow-hidden rounded-xl bg-[#fbfaff] p-3 sm:p-5 lg:p-6">
      <VetPageHeader
        icon={UserCircle}
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin liên hệ, tiểu sử và chuyên môn của bạn. Vai trò + chuyên khoa do quản trị viên gán."
      />

      <div className="flex items-center gap-3 rounded-lg border border-violet-100 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
        <Info className="size-4 shrink-0 text-violet-600" />
        <span>
          Trạng thái hoạt động và danh sách chuyên khoa do quản trị viên quản lý. Mọi thay
          đổi tên/email sẽ ảnh hưởng tới hoá đơn và lịch hẹn — hãy cập nhật cẩn thận.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.65fr]">
        <div className="space-y-5">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle className="text-base font-bold text-slate-950">
                Thông tin định danh
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {profileQuery.isLoading ? (
                <IdentitySkeleton />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-5">
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-violet-100 text-3xl font-bold text-violet-600">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-slate-950">
                        BS. {fullName || 'Chưa có tên'}
                      </div>
                      <StatusBadge active={profile?.active} />
                      {profile?.id !== undefined && (
                        <p className="mt-1 text-xs text-slate-500">
                          Mã bác sĩ:{' '}
                          <span className="font-mono font-semibold text-slate-700">
                            #{profile.id}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                    <ReadField icon={Mail} label="Email" value={profile?.email} />
                    <ReadField
                      icon={Phone}
                      label="Số điện thoại"
                      value={profile?.phoneNumber}
                      action={
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-md bg-violet-50 text-violet-600 hover:bg-violet-100 hover:text-violet-700"
                          onClick={() => {
                            document.getElementById('phoneNumber')?.focus();
                          }}
                          aria-label="Chỉnh sửa số điện thoại"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                      <Stethoscope className="size-4" />
                      Chuyên môn
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(profile?.specialties ?? []).length === 0 ? (
                        <span className="text-sm text-slate-500 italic">Chưa có</span>
                      ) : (
                        profile?.specialties?.map((specialty) => (
                          <Badge
                            key={specialty.id ?? specialty.name}
                            variant="secondary"
                            className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700"
                          >
                            {specialty.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Chuyên khoa được quản trị viên cấp.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <LockKeyhole className="size-3.5 shrink-0" />
                    <span>
                      Cần đổi mật khẩu hoặc khoá tài khoản? Liên hệ quản trị viên.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle className="text-base font-bold text-slate-950">
                Hoạt động chuyên môn
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 p-5">
              <StatTile
                icon={Star}
                label="Điểm trung bình"
                value={ratingAvg != null ? ratingAvg.toFixed(2) : '—'}
                hint={`${ratingCount} lượt đánh giá`}
                loading={ratingsSummaryQuery.isLoading}
              />
              <StatTile
                icon={MessageSquareQuote}
                label="Lượt đánh giá"
                value={String(ratingCount)}
                hint="Từ khách hàng"
                loading={ratingsSummaryQuery.isLoading}
              />
              <StatTile
                icon={CalendarClock}
                label="Khung giờ trực"
                value={String(scheduleCount)}
                hint="Tuần hiện tại"
                loading={scheduleQuery.isLoading}
              />
              <StatTile
                icon={Award}
                label="Huy hiệu"
                value={String(badgeCount)}
                hint="Thành tích đã đạt"
                loading={badgesQuery.isLoading}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader className="border-b border-slate-100 px-5 py-4">
            <CardTitle className="text-base font-bold text-slate-950">
              Cập nhật thông tin
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="space-y-6"
            >
              <SectionTitle icon={User}>Thông tin cá nhân</SectionTitle>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field
                  name="firstName"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor={field.name}
                        className="text-sm font-medium text-slate-700"
                      >
                        Tên *
                      </Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Thanh"
                        className="h-11 rounded-md border-slate-200 bg-white text-base shadow-sm focus-visible:ring-violet-300"
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                />
                <form.Field
                  name="lastName"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor={field.name}
                        className="text-sm font-medium text-slate-700"
                      >
                        Họ *
                      </Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Nguyễn"
                        className="h-11 rounded-md border-slate-200 bg-white text-base shadow-sm focus-visible:ring-violet-300"
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                />
              </div>

              <form.Field
                name="email"
                children={(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <Mail className="size-4 text-violet-600" />
                      Email *
                    </Label>
                    <Input
                      id={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="ten.vet@petclinic.local"
                      className="h-11 rounded-md border-slate-200 bg-white text-base shadow-sm focus-visible:ring-violet-300"
                    />
                    <FieldError field={field} />
                    <p className="text-xs text-slate-500">
                      Email phải duy nhất trong hệ thống. Email trùng → 400.
                    </p>
                  </div>
                )}
              />

              <form.Field
                name="phoneNumber"
                children={(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <Phone className="size-4 text-violet-600" />
                      Số điện thoại
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="0901000001"
                      className="h-11 rounded-md border-slate-200 bg-white text-base shadow-sm focus-visible:ring-violet-300"
                    />
                    <FieldError field={field} />
                    <p className="text-xs text-slate-500">
                      Để trống để xoá số điện thoại đang lưu. Khách hàng có thể thấy số
                      này khi đặt lịch.
                    </p>
                  </div>
                )}
              />

              <div className="space-y-2 border-t border-slate-100 pt-5">
                <SectionTitle icon={MessageSquareQuote}>Tiểu sử nghề nghiệp</SectionTitle>
                <form.Field
                  name="resume"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label
                        htmlFor={field.name}
                        className="text-sm font-medium text-slate-700"
                      >
                        Mô tả ngắn về bạn
                      </Label>
                      <Textarea
                        id={field.name}
                        rows={7}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Mô tả kinh nghiệm, chứng chỉ, lĩnh vực chuyên sâu, năm tốt nghiệp..."
                        className="min-h-40 rounded-md border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-violet-300"
                      />
                      <FieldError field={field} />
                      <p className="text-xs text-slate-500">
                        {field.state.value.length}/10000 ký tự. Hiển thị ở trang chi tiết
                        bác sĩ cho khách hàng. Để trống = xoá tiểu sử.
                      </p>
                    </div>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={updateMutation.isPending || profileQuery.isLoading}
                  className="text-slate-500 hover:text-slate-800"
                  onClick={resetForm}
                >
                  <RotateCcw className="size-4" />
                  Khôi phục
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || profileQuery.isLoading}
                  className="bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                >
                  <Save className="size-4" />
                  {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IdentitySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function StatusBadge({ active }: { active?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'mt-2 rounded-full px-3 py-1 text-xs font-semibold',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
      )}
    >
      <span
        className={cn(
          'mr-1.5 size-2 rounded-full',
          active ? 'bg-emerald-500' : 'bg-slate-400',
        )}
      />
      {active ? 'Đang hoạt động' : 'Tạm nghỉ'}
    </Badge>
  );
}

function ReadField({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1rem_6rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-sm">
      <Icon className="size-4 text-slate-500" />
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <span className="min-w-0 truncate font-medium text-slate-900">{value || '-'}</span>
      {action}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase">
        <Icon className="size-3.5 text-violet-600" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <p className="text-xl font-bold text-slate-950">{value}</p>
      )}
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
      <Icon className="size-4 text-violet-600" />
      {children}
    </div>
  );
}

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'BS';
}
