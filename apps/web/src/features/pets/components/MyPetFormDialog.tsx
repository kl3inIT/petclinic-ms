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
import { usePetTypes } from '@/features/pet-types/api';
import { MediaUploader } from '@/features/vets/components/MediaUploader';

import {
  useAddMyPet,
  useDeleteMyPetPhoto,
  useUpdateMyPet,
  useUploadMyPetPhoto,
} from '@/lib/api/generated/owners/owners';
import type { PetDto } from '@/lib/api/generated/model/petDto';

import { petFormSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tạo mới; PetDto = sửa. */
  pet?: PetDto | null;
}

/**
 * Dialog thêm/sửa thú cưng cho CHỦ NUÔI (self-service qua `/api/v1/owners/me/pets`).
 * vetId/ownerId resolve từ JWT ở BE — FE không cần truyền ownerId.
 * Khác bản admin `PetFormDialog` (cần ownerId, dùng hook `/owners/{id}/pets`).
 */
export function MyPetFormDialog({ open, onOpenChange, pet }: Props) {
  const qc = useQueryClient();
  const isEdit = !!pet?.id;
  const petTypesQuery = usePetTypes();

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

  const addMutation = useAddMyPet({
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

  const updateMutation = useUpdateMyPet({
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
      // photoId không phơi ra cho chủ nuôi (chưa có endpoint upload ảnh pet) —
      // giữ giá trị cũ, gửi nguyên si để không mất dữ liệu khi sửa.
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
        updateMutation.mutate({ petId: pet.id, data });
      } else {
        addMutation.mutate({ data });
      }
    },
  });

  const uploadPhoto = useUploadMyPetPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật ảnh thú cưng');
        void invalidate();
      },
      onError: (err: Error) => toast.error(err.message || 'Tải ảnh thất bại'),
    },
  });

  const deletePhoto = useDeleteMyPetPhoto({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xoá ảnh thú cưng');
        void invalidate();
      },
      onError: (err: Error) => toast.error(err.message || 'Xoá ảnh thất bại'),
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
          <DialogTitle>{isEdit ? 'Sửa hồ sơ thú cưng' : 'Thêm thú cưng'}</DialogTitle>
          <DialogDescription>
            Tên và giống bắt buộc. Chọn "Loài" từ danh mục để hệ thống hiển thị chuẩn.
          </DialogDescription>
        </DialogHeader>

        <form
          id="my-pet-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tên *</Label>
                <Input
                  id={field.name}
                  placeholder="VD: Milu"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="petTypeId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Loài</Label>
                <PetTypeSelect
                  id={field.name}
                  value={field.state.value ?? undefined}
                  placeholder="Chọn chó, mèo, thỏ…"
                  onChange={(v) => {
                    field.handleChange(v ?? null);
                    // Auto-fill "giống" từ code danh mục khi đang trống hoặc khớp code cũ
                    // (không đè input user đã sửa tay).
                    const code = petTypesQuery.data?.find((pt) => pt.id === v)?.code;
                    if (code) {
                      const currentType = form.getFieldValue('type');
                      const prevCode = petTypesQuery.data?.find(
                        (pt) => pt.id === field.state.value,
                      )?.code;
                      if (!currentType || currentType === prevCode) {
                        form.setFieldValue('type', code);
                      }
                    }
                  }}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="type"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Giống *</Label>
                <Input
                  id={field.name}
                  placeholder="VD: Golden Retriever, Mèo Anh lông ngắn…"
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
                    placeholder="VD: 4.5"
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
            name="isActive"
            children={(field) => (
              <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                <span className="font-medium text-foreground">Đang nuôi</span>
                <span className="text-muted-foreground">
                  — hiển thị khi đặt lịch khám
                </span>
              </label>
            )}
          />

          {isEdit && pet?.id != null ? (
            <div className="space-y-2">
              <Label>Ảnh thú cưng</Label>
              {pet.photoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={pet.photoUrl}
                    alt={pet.name ?? 'Ảnh thú cưng'}
                    className="size-16 rounded-lg border object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deletePhoto.isPending}
                    onClick={() => deletePhoto.mutate({ petId: pet.id! })}
                  >
                    Xoá ảnh
                  </Button>
                </div>
              ) : null}
              <MediaUploader
                label="Kéo thả ảnh hoặc bấm để chọn"
                busy={uploadPhoto.isPending}
                onUpload={(file) =>
                  uploadPhoto.mutateAsync({ petId: pet.id!, data: { file } })
                }
              />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Lưu thú cưng trước, rồi mở lại để thêm ảnh.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
