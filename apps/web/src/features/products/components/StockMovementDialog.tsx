import { useEffect, useMemo, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { ArrowDownToLine, ArrowUpFromLine, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/lib/form/FieldError';
import type { ProductResponse } from '@/features/products/api';
import {
  type StockMovementDirection,
  useRecordStockDocument,
} from '@/features/products/inventory-api';
import { stockDocumentFormSchema } from '@/features/products/schemas';

interface Props {
  open: boolean;
  direction: StockMovementDirection;
  products: ProductResponse[];
  product?: ProductResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({
  open,
  direction,
  products,
  product,
  onOpenChange,
}: Props) {
  const mutation = useRecordStockDocument();
  const idempotencyKey = useRef(crypto.randomUUID());
  const availableProducts = useMemo(
    () => products.filter((item) => item.active && item.stockTracked && item.id != null),
    [products],
  );
  const inbound = direction === 'IN';

  const form = useForm({
    defaultValues: initialValues(product),
    validators: { onChange: stockDocumentFormSchema },
    onSubmit: ({ value }) => {
      mutation.mutate(
        {
          idempotencyKey: idempotencyKey.current,
          direction,
          reason: value.reason.trim(),
          reference: value.reference.trim() || undefined,
          items: value.items,
        },
        {
          onSuccess: () => {
            toast.success(inbound ? 'Đã ghi phiếu nhập kho' : 'Đã ghi phiếu xuất kho');
            idempotencyKey.current = crypto.randomUUID();
            onOpenChange(false);
          },
          onError: (error) =>
            toast.error(
              error.message || (inbound ? 'Nhập kho thất bại' : 'Xuất kho thất bại'),
            ),
        },
      );
    },
  });

  useEffect(() => {
    if (!open) return;
    idempotencyKey.current = crypto.randomUUID();
    form.reset(initialValues(product));
  }, [direction, form, open, product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {inbound ? (
              <ArrowDownToLine className="size-5 text-emerald-600" />
            ) : (
              <ArrowUpFromLine className="size-5 text-rose-600" />
            )}
            {inbound ? 'Phiếu nhập kho' : 'Phiếu xuất kho'}
          </DialogTitle>
          <DialogDescription>
            Một phiếu có thể chứa nhiều mặt hàng. Toàn bộ phiếu được ghi nguyên tử vào sổ
            cái và không thể sửa hoặc xoá sau khi lưu.
          </DialogDescription>
        </DialogHeader>

        <form
          id="stock-movement-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field
              name="reference"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="movement-reference">Mã chứng từ</Label>
                  <Input
                    id="movement-reference"
                    placeholder={inbound ? 'VD: PO-2026-001' : 'VD: PX-2026-001'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>

          <form.Field
            name="items"
            mode="array"
            children={(itemsField) => (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Dòng hàng *</Label>
                    <p className="text-xs text-muted-foreground">
                      {itemsField.state.value.length} mặt hàng trong phiếu
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={itemsField.state.value.length >= 100}
                    onClick={() => itemsField.pushValue(emptyLine())}
                  >
                    <Plus /> Thêm dòng
                  </Button>
                </div>

                <div className="hidden grid-cols-[minmax(0,1fr)_9rem_13rem_2.25rem] gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid">
                  <span>Sản phẩm</span>
                  <span>Số lượng</span>
                  <span>Tồn dự kiến</span>
                  <span className="sr-only">Xoá</span>
                </div>

                <div className="space-y-3">
                  {itemsField.state.value.map((line, index) => {
                    const selected = availableProducts.find(
                      (item) => item.id === line.productId,
                    );
                    const currentStock = selected?.stockQuantity ?? 0;
                    const projectedStock = inbound
                      ? currentStock + line.quantity
                      : currentStock - line.quantity;
                    const selectedElsewhere = new Set(
                      itemsField.state.value
                        .filter((_, itemIndex) => itemIndex !== index)
                        .map((item) => item.productId),
                    );

                    return (
                      <div
                        key={index}
                        className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_13rem_2.25rem] sm:border-0 sm:bg-transparent sm:p-0"
                      >
                        <form.Field
                          name={`items[${index}].productId`}
                          children={(field) => (
                            <div className="space-y-1">
                              <Label className="sm:sr-only">Sản phẩm</Label>
                              <Select
                                value={
                                  field.state.value > 0
                                    ? String(field.state.value)
                                    : undefined
                                }
                                onValueChange={(value) =>
                                  field.handleChange(Number(value))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Chọn sản phẩm" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableProducts.map((item) => (
                                    <SelectItem
                                      key={item.id}
                                      value={String(item.id)}
                                      disabled={selectedElsewhere.has(item.id ?? 0)}
                                    >
                                      {item.code} — {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FieldError field={field} />
                            </div>
                          )}
                        />

                        <form.Field
                          name={`items[${index}].quantity`}
                          children={(field) => (
                            <div className="space-y-1">
                              <Label className="sm:sr-only">Số lượng</Label>
                              <Input
                                type="number"
                                min="1"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(Number(event.target.value))
                                }
                              />
                              <FieldError field={field} />
                            </div>
                          )}
                        />

                        <div className="flex h-9 items-center text-sm">
                          {selected ? (
                            <span
                              className={
                                !inbound && projectedStock < 0
                                  ? 'font-medium text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              {currentStock} → {projectedStock} {selected.unit ?? ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Xoá dòng ${index + 1}`}
                          disabled={itemsField.state.value.length === 1}
                          onClick={() => itemsField.removeValue(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <FieldError field={itemsField} />
              </div>
            )}
          />

          <form.Field
            name="reason"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor="movement-reason">Lý do *</Label>
                <Textarea
                  id="movement-reason"
                  rows={3}
                  placeholder={
                    inbound
                      ? 'Nhập từ nhà cung cấp, nhận điều chuyển…'
                      : 'Cấp phát nội bộ, hàng hỏng, hết hạn…'
                  }
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            type="submit"
            form="stock-movement-form"
            disabled={mutation.isPending || availableProducts.length === 0}
          >
            {mutation.isPending
              ? 'Đang ghi sổ…'
              : inbound
                ? 'Ghi phiếu nhập'
                : 'Ghi phiếu xuất'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialValues(product?: ProductResponse | null) {
  return {
    items: [{ productId: product?.id ?? 0, quantity: 1 }],
    reason: '',
    reference: '',
  };
}

function emptyLine() {
  return { productId: 0, quantity: 1 };
}
