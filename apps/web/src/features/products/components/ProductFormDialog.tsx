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
  type ProductResponse,
  useCreateProduct,
  useUpdateProduct,
} from '@/features/products/api';
import { productFormSchema } from '@/features/products/schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductResponse | null;
}

const TYPE_OPTIONS = [
  { value: 'MEDICATION', label: 'Thuốc (có tồn kho)' },
  { value: 'SERVICE', label: 'Dịch vụ (không tồn kho)' },
  { value: 'SUPPLY', label: 'Vật tư (có tồn kho)' },
  { value: 'MERCHANDISE', label: 'Hàng bán lẻ (đồ chơi, thức ăn…)' },
] as const;

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const isEdit = !!product?.id;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const form = useForm({
    defaultValues: {
      code: product?.code ?? '',
      name: product?.name ?? '',
      category: product?.category ?? '',
      description: product?.description ?? '',
      type: product?.type ?? 'MEDICATION',
      unitPrice: product?.unitPrice ?? 0,
      unit: product?.unit ?? '',
      stockQuantity: product?.stockQuantity ?? 0,
      reorderLevel: product?.reorderLevel ?? 0,
      active: product?.active ?? true,
    },
    validators: { onChange: productFormSchema },
    onSubmit: ({ value }) => {
      const category = value.category.trim() || undefined;
      const description = value.description.trim() || undefined;
      const unit = value.unit.trim() || undefined;
      const stockTracked = value.type !== 'SERVICE';
      if (isEdit && product?.id != null) {
        updateMutation.mutate(
          {
            id: product.id,
            data: {
              name: value.name,
              category,
              description,
              unitPrice: value.unitPrice,
              unit,
              stockQuantity: stockTracked ? value.stockQuantity : undefined,
              reorderLevel: value.reorderLevel,
              active: value.active,
            },
          },
          {
            onSuccess: () => {
              toast.success('Đã cập nhật sản phẩm');
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
              type: value.type,
              unitPrice: value.unitPrice,
              unit,
              stockQuantity: stockTracked ? value.stockQuantity : undefined,
              reorderLevel: stockTracked ? value.reorderLevel : undefined,
            },
          },
          {
            onSuccess: () => {
              toast.success('Đã thêm sản phẩm');
              form.reset();
              onOpenChange(false);
            },
            onError: (err) =>
              toast.error((err as Error).message || 'Thêm sản phẩm thất bại'),
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
          <DialogTitle>
            {isEdit ? `Sửa sản phẩm #${product?.id}` : 'Thêm sản phẩm'}
          </DialogTitle>
          <DialogDescription>
            Mã là business key bất biến (vd <code>MED_AMOX</code>). Dịch vụ (SERVICE)
            không quản lý tồn kho. Thuốc/Vật tư trừ kho khi cấp phát.
          </DialogDescription>
        </DialogHeader>

        <form
          id="product-form"
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
                <Label htmlFor={field.name}>Mã sản phẩm *</Label>
                <Input
                  id={field.name}
                  placeholder="MED_AMOX"
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
            name="type"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Loại *</Label>
                <select
                  id={field.name}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={field.state.value}
                  disabled={isEdit}
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(
                      e.target.value as
                        | 'MEDICATION'
                        | 'SERVICE'
                        | 'SUPPLY'
                        | 'MERCHANDISE',
                    )
                  }
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tên *</Label>
                <Input
                  id={field.name}
                  placeholder="Amoxicillin 500mg"
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
              name="unitPrice"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Đơn giá (VND) *</Label>
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
              name="unit"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Đơn vị</Label>
                  <Input
                    id={field.name}
                    placeholder="viên / lần / hộp"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>

          <form.Subscribe
            selector={(s) => s.values.type}
            children={(type) =>
              type === 'SERVICE' ? null : (
                <div className="grid grid-cols-2 gap-3">
                  <form.Field
                    name="stockQuantity"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Tồn kho</Label>
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
                  <form.Field
                    name="reorderLevel"
                    children={(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Ngưỡng cảnh báo</Label>
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
                </div>
              )
            }
          />

          <form.Field
            name="category"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Nhóm</Label>
                <Input
                  id={field.name}
                  placeholder="Kháng sinh / Dịch vụ khám…"
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
                  Đang kinh doanh (active)
                </label>
              )}
            />
          ) : null}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="product-form" disabled={pending}>
            {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
