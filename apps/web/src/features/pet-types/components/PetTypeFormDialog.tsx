import { useForm } from '@tanstack/react-form';
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

import {
  type PetTypeResponse,
  useCreatePetType,
  useUpdatePetType,
} from '@/features/pet-types/api';

import { petTypeFormSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petType?: PetTypeResponse | null;
}

export function PetTypeFormDialog({ open, onOpenChange, petType }: Props) {
  const isEdit = !!petType?.id;
  const createMutation = useCreatePetType();
  const updateMutation = useUpdatePetType();

  const form = useForm({
    defaultValues: {
      code: petType?.code ?? '',
      name: petType?.name ?? '',
      displayOrder: petType?.displayOrder ?? 100,
    },
    validators: { onChange: petTypeFormSchema },
    onSubmit: ({ value }) => {
      const payload = {
        code: value.code,
        name: value.name,
        displayOrder: value.displayOrder,
      };
      if (isEdit && petType?.id != null) {
        updateMutation.mutate(
          { id: petType.id, payload },
          {
            onSuccess: () => {
              toast.success('Đã cập nhật loại pet');
              form.reset();
              onOpenChange(false);
            },
            onError: (err) => toast.error((err as Error).message || 'Cập nhật thất bại'),
          },
        );
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            toast.success('Đã tạo loại pet');
            form.reset();
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error((err as Error).message || 'Tạo loại pet thất bại'),
        });
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
            {isEdit ? `Sửa loại pet #${petType?.id}` : 'Thêm loại pet'}
          </DialogTitle>
          <DialogDescription>
            Code là business key bất biến (vd <code>dog</code>); tên hiển thị có thể đổi.
          </DialogDescription>
        </DialogHeader>

        <form
          id="pet-type-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="code"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Code *</Label>
                <Input
                  id={field.name}
                  placeholder="dog"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tên hiển thị *</Label>
                <Input
                  id={field.name}
                  placeholder="Chó"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="displayOrder"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Display order</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                <FieldError field={field} />
              </div>
            )}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="pet-type-form" disabled={pending}>
            {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
