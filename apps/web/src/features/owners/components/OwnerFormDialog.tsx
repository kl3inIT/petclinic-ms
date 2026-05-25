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

import { useCreateOwner, useUpdateOwner } from '@/lib/api/generated/owners/owners';
import type { OwnerResponse } from '@/lib/api/generated/model/ownerResponse';
import { ownerFormSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = chế độ tạo mới; OwnerResponse = chế độ sửa */
  owner?: OwnerResponse | null;
}

export function OwnerFormDialog({ open, onOpenChange, owner }: Props) {
  const qc = useQueryClient();
  const isEdit = !!owner?.id;

  const invalidateOwners = () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const first = q.queryKey[0];
        return typeof first === 'string' && first.startsWith('/api/v1/owners');
      },
    });

  const createMutation = useCreateOwner({
    mutation: {
      onSuccess: () => {
        toast.success('Đã tạo chủ nuôi');
        void invalidateOwners();
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Tạo thất bại'),
    },
  });

  const updateMutation = useUpdateOwner({
    mutation: {
      onSuccess: () => {
        toast.success('Đã cập nhật chủ nuôi');
        void invalidateOwners();
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Cập nhật thất bại'),
    },
  });

  const form = useForm({
    // defaultValues recreated mỗi lần dialog mở (key prop reset từ parent)
    defaultValues: {
      firstName: owner?.firstName ?? '',
      lastName: owner?.lastName ?? '',
      address: owner?.address ?? '',
      city: owner?.city ?? '',
      telephone: owner?.telephone ?? '',
    },
    validators: { onChange: ownerFormSchema },
    onSubmit: ({ value }) => {
      const data = {
        firstName: value.firstName,
        lastName: value.lastName,
        address: value.address || undefined,
        city: value.city || undefined,
        telephone: value.telephone || undefined,
      };
      if (isEdit && owner?.id != null) {
        updateMutation.mutate({ id: owner.id, data });
      } else {
        createMutation.mutate({ data });
      }
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;

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
            {isEdit ? `Sửa chủ nuôi #${owner?.id}` : 'Thêm chủ nuôi mới'}
          </DialogTitle>
          <DialogDescription>
            Họ và tên bắt buộc, các trường khác tùy chọn.
          </DialogDescription>
        </DialogHeader>

        <form
          id="owner-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <form.Field
            name="address"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Địa chỉ</Label>
                <Input
                  id={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="city"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Thành phố</Label>
                  <Input
                    id={field.name}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="telephone"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Điện thoại</Label>
                  <Input
                    id={field.name}
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="owner-form" disabled={pending}>
            {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
