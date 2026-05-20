import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Mail, Phone, Save, Stethoscope, UserCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError } from '@/lib/form/FieldError';
import { useMyProfile, useUpdateMyProfile } from '@/features/vet-me/api';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';

/**
 * Vet sửa thông tin cá nhân (resume + phone). KHÔNG cho sửa email/firstName/lastName/
 * active — đây là identity, admin sửa qua /api/v1/vets/{id}.
 */
const profileFormSchema = z.object({
  phoneNumber: z.string().max(30, 'Tối đa 30 ký tự'),
  resume: z.string().max(10_000, 'Tối đa 10000 ký tự'),
});

export const Route = createFileRoute('/vet/profile')({
  component: VetProfilePage,
});

function VetProfilePage() {
  const profileQuery = useMyProfile();
  const updateMutation = useUpdateMyProfile();

  const form = useForm({
    defaultValues: { phoneNumber: '', resume: '' },
    validators: { onChange: profileFormSchema },
    onSubmit: ({ value }) =>
      updateMutation.mutate(
        {
          phoneNumber: value.phoneNumber.trim() || undefined,
          resume: value.resume.trim() || undefined,
        },
        {
          onSuccess: () => toast.success('Đã cập nhật hồ sơ'),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại'),
        },
      ),
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({
        phoneNumber: profileQuery.data.phoneNumber ?? '',
        resume: profileQuery.data.resume ?? '',
      });
    }
  }, [profileQuery.data, form]);

  const profile = profileQuery.data;

  return (
    <div className="space-y-6">
      <VetPageHeader
        icon={UserCircle}
        title="Hồ sơ cá nhân"
        subtitle="Thông tin định danh do quản trị viên duy trì. Bạn có thể sửa số điện thoại và tiểu sử."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Identity card — read-only */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Thông tin định danh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {profileQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : (
              <>
                {/* Avatar placeholder — Phase E2 có endpoint photo, regen orval sẽ thay */}
                <div className="flex items-center gap-3">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                    {(profile?.firstName ?? '?').charAt(0)}
                    {(profile?.lastName ?? '?').charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">
                      BS. {profile?.firstName} {profile?.lastName}
                    </div>
                    <Badge
                      variant={profile?.active ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {profile?.active ? 'Đang hoạt động' : 'Tạm nghỉ'}
                    </Badge>
                  </div>
                </div>

                <ReadField icon={Mail} label="Email" value={profile?.email} />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Stethoscope className="size-3.5" />
                    Chuyên môn
                  </div>
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

                <p className="border-t pt-3 text-xs text-muted-foreground">
                  Cần đổi tên hoặc email? Liên hệ admin.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Editable form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cập nhật thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="space-y-5"
            >
              <form.Field
                name="phoneNumber"
                children={(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="flex items-center gap-1.5"
                    >
                      <Phone className="size-3.5" />
                      Số điện thoại
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="0901 234 567"
                    />
                    <FieldError field={field} />
                    <p className="text-xs text-muted-foreground">
                      Khách hàng có thể thấy số này khi đặt lịch khám.
                    </p>
                  </div>
                )}
              />

              <form.Field
                name="resume"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Tiểu sử / Kinh nghiệm</Label>
                    <Textarea
                      id={field.name}
                      rows={8}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Mô tả kinh nghiệm, chứng chỉ, lĩnh vực chuyên sâu, năm tốt nghiệp…"
                    />
                    <FieldError field={field} />
                    <p className="text-xs text-muted-foreground">
                      {field.state.value.length}/10000 ký tự
                    </p>
                  </div>
                )}
              />

              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={updateMutation.isPending || !form.state.isDirty}
                  onClick={() => {
                    if (profile) {
                      form.reset({
                        phoneNumber: profile.phoneNumber ?? '',
                        resume: profile.resume ?? '',
                      });
                    }
                  }}
                >
                  Khôi phục
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.state.isDirty}
                >
                  <Save className="size-4" />
                  {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReadField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="text-sm">{value || '—'}</div>
    </div>
  );
}
