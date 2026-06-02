import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/lib/form/FieldError';

import {
  getGetVetQueryKey,
  useDeleteVet,
  useUpdateVet,
} from '@/lib/api/generated/vets/vets';
import { useListSpecialties } from '@/lib/api/generated/specialties/specialties';
import type { VetResponse } from '@/lib/api/generated/model';
import { vetSchema } from '../schemas';

interface Props {
  vet: VetResponse;
  onDeleted: () => void;
}

export function VetInfoTab({ vet, onDeleted }: Props) {
  const qc = useQueryClient();
  const specialtiesQuery = useListSpecialties();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [active, setActive] = useState(vet.active ?? true);
  const [specialtyNames, setSpecialtyNames] = useState<string[]>(
    (vet.specialties ?? []).map((s) => s.name).filter((n): n is string => !!n),
  );

  const updateMutation = useUpdateVet({
    mutation: {
      onSuccess: (data) => {
        toast.success('Đã cập nhật hồ sơ');
        if (vet.id != null) {
          qc.setQueryData(getGetVetQueryKey(vet.id), data);
        }
        void qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey[0];
            return typeof k === 'string' && k.startsWith('/api/v1/vets');
          },
        });
      },
      onError: (err: Error) => toast.error(err.message || 'Cập nhật thất bại'),
    },
  });

  const deleteMutation = useDeleteVet({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa bác sĩ');
        void qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey[0];
            return typeof k === 'string' && k.startsWith('/api/v1/vets');
          },
        });
        onDeleted();
      },
      onError: (err: Error) => toast.error(err.message || 'Xóa thất bại'),
    },
  });

  const form = useForm({
    defaultValues: {
      firstName: vet.firstName ?? '',
      lastName: vet.lastName ?? '',
      email: vet.email ?? '',
      phoneNumber: vet.phoneNumber ?? '',
      vetBillId: vet.vetBillId ?? '',
      resume: vet.resume ?? '',
    },
    validators: { onChange: vetSchema },
    onSubmit: ({ value }) => {
      if (vet.id == null) return;
      updateMutation.mutate({
        id: vet.id,
        data: {
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          phoneNumber: value.phoneNumber,
          vetBillId: value.vetBillId,
          resume: value.resume,
          active,
          specialtyNames,
        },
      });
    },
  });

  useEffect(() => {
    form.reset({
      firstName: vet.firstName ?? '',
      lastName: vet.lastName ?? '',
      email: vet.email ?? '',
      phoneNumber: vet.phoneNumber ?? '',
      vetBillId: vet.vetBillId ?? '',
      resume: vet.resume ?? '',
    });
    setActive(vet.active ?? true);
    setSpecialtyNames(
      (vet.specialties ?? []).map((s) => s.name).filter((n): n is string => !!n),
    );
  }, [
    vet.id,
    vet.firstName,
    vet.lastName,
    vet.email,
    vet.phoneNumber,
    vet.vetBillId,
    vet.resume,
    vet.active,
    vet.specialties,
    form,
  ]);

  function toggleSpecialty(name: string) {
    setSpecialtyNames((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <form.Field
            name="firstName"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tên *</Label>
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
            name="lastName"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Họ *</Label>
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
            name="email"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email *</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
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
                  placeholder="Để trống để xóa"
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="vetBillId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Mã liên kết billing</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Để trống để xóa"
                />
                <FieldError field={field} />
              </div>
            )}
          />
        </div>

        <form.Field
          name="resume"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Tiểu sử / CV</Label>
              <Textarea
                id={field.name}
                rows={4}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Để trống để xóa"
              />
              <FieldError field={field} />
            </div>
          )}
        />

        <div className="space-y-2">
          <Label>Chuyên môn</Label>
          <div className="flex flex-wrap gap-2">
            {specialtiesQuery.data?.map((s) => {
              const name = s.name ?? '';
              if (!name) return null;
              const selected = specialtyNames.includes(name);
              return (
                <button
                  key={s.id ?? name}
                  type="button"
                  onClick={() => toggleSpecialty(name)}
                  className="cursor-pointer"
                >
                  <Badge variant={selected ? 'default' : 'outline'}>{name}</Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4"
          />
          <Label htmlFor="active">Đang hoạt động</Label>
        </div>

        <div className="flex justify-between gap-2">
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Xóa bác sĩ
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save />
            Lưu thay đổi
          </Button>
        </div>
      </form>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Cân nhắc tắt hoạt động (active=false) thay
              vì xóa cứng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={vet.id == null || deleteMutation.isPending}
              onClick={() => {
                if (vet.id == null) return;
                deleteMutation.mutate({ id: vet.id });
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
