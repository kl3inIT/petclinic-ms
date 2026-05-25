import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/lib/form/FieldError';
import { PetTypeSelect } from '@/features/pet-types/PetTypeSelect';

import { useAddPet, useUpdatePet } from '@/lib/api/generated/owners/owners';
import type { PetDto } from '@/lib/api/generated/model/petDto';

import { petFormSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Owner ID — required cho cả add và edit (Pet thuộc Owner aggregate) */
  ownerId: number;
  /** null = chế độ tạo mới; Pet object = chế độ sửa */
  pet?: PetDto | null;
}

export function PetFormDialog({ open, onOpenChange, ownerId, pet }: Props) {
  const qc = useQueryClient();
  const isEdit = !!pet?.id;

  const invalidate = () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const first = q.queryKey[0];
        return (
          typeof first === 'string' &&
          (first.startsWith('/api/v1/owners') || first.startsWith('/api/v1/pets'))
        );
      },
    });

  const addMutation = useAddPet({
    mutation: {
      onSuccess: () => {
        toast.success('Đã thêm thú cưng');
        void invalidate();
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Thêm thất bại'),
    },
  });

  const updateMutation = useUpdatePet({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật thú cưng');
        void invalidate();
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Cập nhật thất bại'),
    },
  });

  const form = useForm({
    defaultValues: {
      name: pet?.name ?? '',
      type: pet?.type ?? '',
      birthDate: pet?.birthDate ?? '',
      petTypeId: pet?.petTypeId ?? null,
      isActive: pet?.isActive ?? true,
      weight: pet?.weight ?? null,
      photoId: pet?.photoId ?? '',
    },
    validators: { onChange: petFormSchema },
    onSubmit: ({ value }) => {
      const data = {
        name: value.name,
        type: value.type,
        birthDate: value.birthDate || undefined,
        petTypeId: value.petTypeId ?? undefined,
        isActive: value.isActive,
        weight: value.weight ?? undefined,
        photoId: value.photoId || undefined,
      };
      if (isEdit && pet?.id != null) {
        updateMutation.mutate({ id: ownerId, petId: pet.id, data });
      } else {
        addMutation.mutate({ id: ownerId, data });
      }
    },
  });

  const pending = addMutation.isPending || updateMutation.isPending;

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
          <DialogTitle>
            {isEdit ? `Sửa thú cưng #${pet?.id}` : 'Thêm thú cưng'}
          </DialogTitle>
          <DialogDescription>
            Tên và loại bắt buộc; chọn catalog "Loại pet" để chuẩn hóa hiển thị.
          </DialogDescription>
        </DialogHeader>

        <form
          id="pet-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="name"
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
              name="type"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Loài (free-text) *</Label>
                  <Input
                    id={field.name}
                    placeholder="dog, cat, …"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>

          <form.Field
            name="petTypeId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Loại pet (catalog)</Label>
                <PetTypeSelect
                  id={field.name}
                  value={field.state.value ?? undefined}
                  onChange={(v) => field.handleChange(v ?? null)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="birthDate"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Ngày sinh</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="weight"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Cân nặng (kg)</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step="0.1"
                    min="0"
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.handleChange(v === '' ? null : Number(v));
                    }}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>

          <form.Field
            name="photoId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Photo ID (MinIO object key)</Label>
                <Input
                  id={field.name}
                  placeholder="pet-photos/123.jpg"
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="isActive"
            children={(field) => (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                Đang hoạt động
              </label>
            )}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="pet-form" disabled={pending}>
            {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
