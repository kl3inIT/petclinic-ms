import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError } from '@/lib/form/FieldError';

import {
  getListVetEducationsQueryKey,
  useAddVetEducation,
  useDeleteVetEducation,
  useListVetEducations,
  useUpdateVetEducation,
} from '@/lib/api/generated/vet-educations/vet-educations';
import type { EducationResponse } from '@/lib/api/generated/model';
import { educationSchema } from '../schemas';

interface Props {
  vetId: number;
}

export function VetEducationTab({ vetId }: Props) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EducationResponse | null>(null);
  const [deleting, setDeleting] = useState<EducationResponse | null>(null);

  const listQuery = useListVetEducations(vetId, {
    pageable: { page: 0, size: 50, sort: ['startDate,desc'] },
  });

  function invalidate() {
    void qc.invalidateQueries({ queryKey: getListVetEducationsQueryKey(vetId) });
  }

  const addMutation = useAddVetEducation({
    mutation: {
      onSuccess: () => {
        toast.success('Đã thêm bằng cấp');
        invalidate();
        setFormOpen(false);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const updateMutation = useUpdateVetEducation({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật');
        invalidate();
        setEditing(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const deleteMutation = useDeleteVetEducation({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa');
        invalidate();
        setDeleting(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Bằng cấp / quá trình đào tạo</p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus />
          Thêm bằng cấp
        </Button>
      </div>

      {listQuery.isLoading || listQuery.isError ? (
        <Skeleton className="h-24 w-full" />
      ) : (listQuery.data?.content ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <GraduationCap className="size-5" />
            Chưa có bằng cấp nào
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listQuery.data?.content?.map((edu) => (
            <Card key={edu.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {edu.degree} — {edu.schoolName}
                  </p>
                  {edu.fieldOfStudy && (
                    <p className="text-sm text-muted-foreground">
                      Chuyên ngành: {edu.fieldOfStudy}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {edu.startDate} → {edu.endDate ?? 'Hiện tại'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Sửa bằng cấp ${edu.degree ?? ''}`.trim()}
                    title="Sửa"
                    onClick={() => setEditing(edu)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Xóa bằng cấp ${edu.degree ?? ''}`.trim()}
                    title="Xóa"
                    onClick={() => setDeleting(edu)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EducationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Thêm bằng cấp"
        busy={addMutation.isPending}
        onSubmit={(data) =>
          addMutation.mutate({
            vetId,
            data: {
              schoolName: data.schoolName,
              degree: data.degree,
              fieldOfStudy: data.fieldOfStudy || undefined,
              startDate: data.startDate,
              endDate: data.endDate || undefined,
            },
          })
        }
      />

      {editing && (
        <EducationFormDialog
          open={true}
          onOpenChange={(o) => !o && setEditing(null)}
          title="Sửa bằng cấp"
          initial={editing}
          busy={updateMutation.isPending}
          onSubmit={(data) => {
            if (editing.id == null) return;
            updateMutation.mutate({
              vetId,
              educationId: editing.id,
              data: {
                schoolName: data.schoolName,
                degree: data.degree,
                fieldOfStudy: data.fieldOfStudy || undefined,
                startDate: data.startDate,
                endDate: data.endDate || undefined,
              },
            });
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bằng cấp</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.degree} — {deleting?.schoolName}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting?.id == null) return;
                deleteMutation.mutate({ vetId, educationId: deleting.id });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: EducationResponse;
  busy?: boolean;
  onSubmit: (data: {
    schoolName: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
  }) => void;
}

function EducationFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  busy,
  onSubmit,
}: FormProps) {
  const form = useForm({
    defaultValues: {
      schoolName: initial?.schoolName ?? '',
      degree: initial?.degree ?? '',
      fieldOfStudy: initial?.fieldOfStudy ?? '',
      startDate: initial?.startDate ?? '',
      endDate: initial?.endDate ?? '',
    },
    validators: { onChange: educationSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-3"
        >
          <form.Field
            name="schoolName"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Trường *</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="degree"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Bằng / Chứng chỉ *</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="fieldOfStudy"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Chuyên ngành</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="startDate"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Bắt đầu *</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="endDate"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Kết thúc</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
