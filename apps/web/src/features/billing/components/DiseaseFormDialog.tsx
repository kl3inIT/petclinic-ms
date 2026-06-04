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
  type DiseaseResponse,
  useCreateDisease,
  useUpdateDisease,
} from '@/features/billing/api';
import { diseaseFormSchema } from '@/features/billing/schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disease?: DiseaseResponse | null;
}

export function DiseaseFormDialog({ open, onOpenChange, disease }: Props) {
  const isEdit = !!disease?.id;
  const createMutation = useCreateDisease();
  const updateMutation = useUpdateDisease();

  const form = useForm({
    defaultValues: {
      code: disease?.code ?? '',
      name: disease?.name ?? '',
      category: disease?.category ?? '',
      description: disease?.description ?? '',
      baseCost: disease?.baseCost ?? 0,
      active: disease?.active ?? true,
    },
    validators: { onChange: diseaseFormSchema },
    onSubmit: ({ value }) => {
      const category = value.category.trim() || undefined;
      const description = value.description.trim() || undefined;
      if (isEdit && disease?.id != null) {
        updateMutation.mutate(
          {
            id: disease.id,
            data: {
              name: value.name,
              category,
              description,
              baseCost: value.baseCost,
              active: value.active,
            },
          },
          {
            onSuccess: () => {
              toast.success('Đã cập nhật bệnh');
              form.reset();
              onOpenChange(false);
            },
            onError: (err) => toast.error((err as Error).message || 'Cập nhật thất bại'),
          },
        );
      } else {
        createMutation.mutate(
          {
            data: {
              code: value.code,
              name: value.name,
              category,
              description,
              baseCost: value.baseCost,
            },
          },
          {
            onSuccess: () => {
              toast.success('Đã thêm bệnh');
              form.reset();
              onOpenChange(false);
            },
            onError: (err) => toast.error((err as Error).message || 'Thêm bệnh thất bại'),
          },
        );
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
          <DialogTitle>{isEdit ? `Sửa bệnh #${disease?.id}` : 'Thêm bệnh'}</DialogTitle>
          <DialogDescription>
            Mã bệnh là business key bất biến (vd <code>PARVO</code>); chi phí là đơn giá
            mặc định khi lập hoá đơn.
          </DialogDescription>
        </DialogHeader>

        <form
          id="disease-form"
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
                <Label htmlFor={field.name}>Mã bệnh *</Label>
                <Input
                  id={field.name}
                  placeholder="PARVO"
                  value={field.state.value}
                  disabled={isEdit}
                  readOnly={isEdit}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tên bệnh *</Label>
                <Input
                  id={field.name}
                  placeholder="Bệnh Parvo"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="category"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Nhóm</Label>
                <Input
                  id={field.name}
                  placeholder="Truyền nhiễm"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="baseCost"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Chi phí mặc định (VND) *</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="0"
                  step="1000"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="description"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Mô tả</Label>
                <Input
                  id={field.name}
                  placeholder="Viêm ruột xuất huyết do Parvovirus"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          {isEdit ? (
            <form.Field
              name="active"
              children={(field) => (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                  Đang áp dụng (active)
                </label>
              )}
            />
          ) : null}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="disease-form" disabled={pending}>
            {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
