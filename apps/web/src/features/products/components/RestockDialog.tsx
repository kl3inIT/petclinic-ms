import { useEffect, useRef } from 'react';
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

import { type ProductResponse, useRestockProduct } from '@/features/products/api';
import { restockFormSchema } from '@/features/products/schemas';

interface Props {
  product: ProductResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function RestockDialog({ product, onOpenChange }: Props) {
  const restockMutation = useRestockProduct();
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, [product?.id]);

  const form = useForm({
    defaultValues: { quantity: 0 },
    validators: { onChange: restockFormSchema },
    onSubmit: ({ value }) => {
      if (product?.id == null) return;
      restockMutation.mutate(
        {
          id: product.id,
          data: { quantity: value.quantity },
          idempotencyKey: idempotencyKey.current,
        },
        {
          onSuccess: () => {
            idempotencyKey.current = crypto.randomUUID();
            toast.success('Đã nhập thêm tồn kho');
            form.reset();
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message || 'Nhập kho thất bại'),
        },
      );
    },
  });

  return (
    <Dialog
      open={!!product}
      onOpenChange={(o) => {
        if (!o) {
          form.reset();
          idempotencyKey.current = crypto.randomUUID();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nhập thêm tồn kho</DialogTitle>
          <DialogDescription>
            {product?.name} (<code>{product?.code}</code>) — tồn hiện tại:{' '}
            <strong>{product?.stockQuantity ?? 0}</strong> {product?.unit ?? ''}
          </DialogDescription>
        </DialogHeader>

        <form
          id="restock-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="quantity"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Số lượng nhập thêm *</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="1"
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
          <Button type="submit" form="restock-form" disabled={restockMutation.isPending}>
            {restockMutation.isPending ? 'Đang lưu…' : 'Nhập kho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
