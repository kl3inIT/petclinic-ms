import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError } from '@/lib/form/FieldError';
import { useMyProfile, useUpdateMyProfile } from '@/features/vet-me/api';

/**
 * Cho phép vet sửa thông tin cá nhân (resume + phone). KHÔNG cho sửa email/firstName/
 * lastName ở /me — đây là identity, admin mới sửa. KHÔNG sửa active (admin disable).
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

  // Sync defaults khi profile load xong (TanStack Form không tự refresh từ async data)
  useEffect(() => {
    if (profileQuery.data) {
      form.reset({
        phoneNumber: profileQuery.data.phoneNumber ?? '',
        resume: profileQuery.data.resume ?? '',
      });
    }
  }, [profileQuery.data, form]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Hồ sơ cá nhân</h1>
        <p className="text-sm text-muted-foreground">
          Thông tin định danh do quản trị viên duy trì. Bạn có thể sửa số điện
          thoại và tiểu sử (resume).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin định danh (read-only)</CardTitle>
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
              <Field label="Họ và tên">
                {profileQuery.data?.firstName} {profileQuery.data?.lastName}
              </Field>
              <Field label="Email">{profileQuery.data?.email}</Field>
              <Field label="Chuyên môn">
                {(profileQuery.data?.specialties ?? [])
                  .map((s) => s.name)
                  .join(', ') || '—'}
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cập nhật</CardTitle>
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
                  <Label htmlFor={field.name}>Số điện thoại</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="0901 234 567"
                  />
                  <FieldError field={field} />
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
                    rows={6}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Mô tả kinh nghiệm, chứng chỉ, lĩnh vực chuyên sâu…"
                  />
                  <FieldError field={field} />
                </div>
              )}
            />

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="col-span-2">{children}</span>
    </div>
  );
}
