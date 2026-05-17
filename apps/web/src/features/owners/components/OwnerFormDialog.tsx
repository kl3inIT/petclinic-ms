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

import { useCreateOwner } from '@/lib/api/generated/owners/owners';
import { ownerFormSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnerFormDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const createMutation = useCreateOwner({
    mutation: {
      onSuccess: () => {
        toast.success('Đã tạo chủ nuôi');
        void qc.invalidateQueries({
          predicate: (q) => {
            const first = q.queryKey[0];
            return typeof first === 'string' && first.startsWith('/api/v1/owners');
          },
        });
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Tạo thất bại'),
    },
  });

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      telephone: '',
    },
    validators: { onChange: ownerFormSchema },
    onSubmit: ({ value }) =>
      createMutation.mutate({
        data: {
          firstName: value.firstName,
          lastName: value.lastName,
          address: value.address || undefined,
          city: value.city || undefined,
          telephone: value.telephone || undefined,
        },
      }),
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
          <DialogTitle>Thêm chủ nuôi mới</DialogTitle>
          <DialogDescription>Họ và tên bắt buộc, các trường khác tùy chọn.</DialogDescription>
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
          <Button type="submit" form="owner-form" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Đang lưu…' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
