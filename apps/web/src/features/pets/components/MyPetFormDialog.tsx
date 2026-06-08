import { useEffect, useState } from 'react';
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
import type { OwnerResponse } from '@/lib/api/generated/model/ownerResponse';
import type { PetDto } from '@/lib/api/generated/model/petDto';

import { petFormSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tạo mới; PetDto = sửa. */
  pet?: PetDto | null;
}

/** Pet mới luôn có id lớn nhất (BIGSERIAL tăng dần) trong owner trả về sau khi add. */
function newestPetId(owner: OwnerResponse): number | null {
  return (owner.pets ?? []).reduce<number | null>(
    (max, p) => (p.id != null && (max == null || p.id > max) ? p.id : max),
    null,
  );
}

/**
 * Dialog thêm/sửa thú cưng cho CHỦ NUÔI (self-service qua `/api/v1/owners/me/pets`).
 * vetId/ownerId resolve từ JWT ở BE — FE không cần truyền ownerId.
 * Khác bản admin `PetFormDialog` (cần ownerId, dùng hook `/owners/{id}/pets`).
 *
 * <h4>Ảnh: staged — chỉ commit lên MinIO khi bấm "Lưu"</h4>
 * MediaUploader chạy deferred mode: chọn/kéo ảnh chỉ stage vào state + preview, KHÔNG upload
 * ngay. Khi submit: (1) tạo/cập nhật pet, (2) nếu có ảnh staged → PUT photo theo petId
 * (add mode lấy id từ owner trả về), (3) nếu user bấm "Xoá ảnh" mà không chọn ảnh mới →
 * DELETE photo. Toàn bộ trong cùng một lần bấm "Lưu".
 */
export function MyPetFormDialog({ open, onOpenChange, pet }: Props) {
  const qc = useQueryClient();
  const isEdit = !!pet?.id;
  const petTypesQuery = usePetTypes();

  // Ảnh staged — chưa upload tới khi bấm "Lưu".
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  // User bấm "Xoá ảnh" trên ảnh hiện có (edit) mà chưa chọn ảnh mới.
  const [removeExisting, setRemoveExisting] = useState(false);

  useEffect(() => {
    if (!stagedFile) {
      setStagedPreview(null);
      return;
    }
    const url = URL.createObjectURL(stagedFile);
    setStagedPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedFile]);

  const resetExtras = () => {
    setStagedFile(null);
    setRemoveExisting(false);
  };

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

  const addMutation = useAddMyPet();
  const updateMutation = useUpdateMyPet();
  const uploadPhoto = useUploadMyPetPhoto();
  const deletePhoto = useDeleteMyPetPhoto();

  const pending =
    addMutation.isPending ||
    updateMutation.isPending ||
    uploadPhoto.isPending ||
    deletePhoto.isPending;

  const form = useForm({
    defaultValues: {
      name: pet?.name ?? '',
      type: pet?.type ?? '',
      birthDate: pet?.birthDate ?? '',
      petTypeId: pet?.petTypeId ?? null,
      isActive: pet?.isActive ?? true,
      weight: pet?.weight ?? null,
      // photoId là MinIO object key, không sửa trực tiếp ở form — giữ giá trị cũ gửi
      // nguyên si để không mất khi sửa field khác. Ảnh thay qua upload/delete riêng.
      photoId: pet?.photoId ?? '',
    },
    validators: { onChange: petFormSchema },
    onSubmit: async ({ value }) => {
      const data = {
        name: value.name,
        type: value.type,
        birthDate: value.birthDate || undefined,
        petTypeId: value.petTypeId ?? undefined,
        isActive: value.isActive,
        weight: value.weight ?? undefined,
        photoId: value.photoId || undefined,
      };
      try {
        let petId: number | null = pet?.id ?? null;
        if (isEdit && petId != null) {
          await updateMutation.mutateAsync({ petId, data });
        } else {
          const owner = await addMutation.mutateAsync({ data });
          petId = newestPetId(owner);
        }

        // Commit ảnh sau khi pet đã tồn tại.
        if (petId != null) {
          if (stagedFile) {
            await uploadPhoto.mutateAsync({ petId, data: { file: stagedFile } });
          } else if (isEdit && removeExisting && pet?.photoUrl) {
            await deletePhoto.mutateAsync({ petId });
          }
        }

        toast.success(isEdit ? 'Đã cập nhật thú cưng' : 'Đã thêm thú cưng');
        void invalidate();
        form.reset();
        resetExtras();
        onOpenChange(false);
      } catch (err) {
        toast.error((err as Error)?.message || 'Lưu thất bại');
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          form.reset();
          resetExtras();
        }
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

          <div className="space-y-2">
            <Label>Ảnh thú cưng</Label>
            {/* Ảnh hiện có (chỉ edit, chưa stage ảnh mới, chưa bấm xoá). */}
            {isEdit && pet?.photoUrl && !stagedFile && !removeExisting ? (
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
                  disabled={pending}
                  onClick={() => setRemoveExisting(true)}
                >
                  Xoá ảnh
                </Button>
              </div>
            ) : null}

            {/* Deferred uploader — chọn/kéo chỉ stage; preview do parent điều khiển. */}
            <MediaUploader
              busy={pending}
              label="Kéo thả ảnh hoặc bấm để chọn"
              onSelect={(file) => {
                setStagedFile(file);
                setRemoveExisting(false);
              }}
              externalPreview={stagedPreview}
              onClearPreview={() => setStagedFile(null)}
            />

            <p className="text-xs text-muted-foreground">
              {removeExisting && !stagedFile
                ? 'Ảnh hiện tại sẽ bị xoá khi bấm "Lưu".'
                : isEdit
                  ? 'Ảnh chỉ được lưu khi bấm "Lưu".'
                  : 'Ảnh sẽ được tải lên sau khi tạo thú cưng (khi bấm "Lưu").'}
            </p>
          </div>

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
