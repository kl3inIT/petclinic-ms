import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/lib/form/FieldError';

import {
  type InvoiceResponse,
  useAddInvoiceItem,
  useDiseases,
  useRemoveInvoiceItem,
} from '@/features/billing/api';
import { formatVnd } from '@/features/billing/format';
import { miscItemFormSchema } from '@/features/billing/schemas';
import { ITEM_SOURCE_CLASS, ITEM_SOURCE_LABEL } from '@/features/billing/labels';
import { useProducts } from '@/features/products/api';

interface Props {
  invoice: InvoiceResponse;
  /** Gọi sau khi thêm/bớt dòng để parent refetch hoá đơn (getInvoice hoặc list). */
  onChanged?: () => void;
  /** Màn quầy chỉ thanh toán/bán hàng, không thêm khoản điều trị theo danh mục bệnh. */
  showTreatmentAdd?: boolean;
  /** Màn bác sĩ không bán hàng bán lẻ. */
  showRetailAdd?: boolean;
}

/**
 * Bảng dòng hoá đơn + thêm (điều trị bệnh / hàng bán lẻ / phụ phí) + xoá dòng.
 * KHÔNG bao gồm checkout/huỷ — phần thanh toán do parent (quầy admin) tự render.
 * Dùng chung bởi quầy admin (`admin.invoices`) và màn lập hoá đơn của vet.
 */
export function InvoiceItemsEditor({
  invoice,
  onChanged,
  showTreatmentAdd = true,
  showRetailAdd = true,
}: Props) {
  const isOpen = invoice.status === 'OPEN';
  const invoiceId = invoice.id!;
  const items = invoice.items ?? [];

  const diseasesQuery = useDiseases({
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });
  const diseases = (diseasesQuery.data?.content ?? []).filter((d) => d.active);
  const merchandiseQuery = useProducts({
    type: 'MERCHANDISE',
    active: true,
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });
  const merchandise = merchandiseQuery.data?.content ?? [];

  const addItem = useAddInvoiceItem();
  const removeItem = useRemoveInvoiceItem();

  const [diseaseId, setDiseaseId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productQty, setProductQty] = useState<number>(1);

  const miscForm = useForm({
    defaultValues: { description: '', unitPrice: 0, quantity: 1 },
    validators: { onChange: miscItemFormSchema },
    onSubmit: ({ value, formApi }) => {
      addItem.mutate(
        {
          id: invoiceId,
          data: {
            sourceType: 'MISC',
            description: value.description,
            unitPrice: value.unitPrice,
            quantity: value.quantity,
          },
        },
        {
          onSuccess: () => {
            toast.success('Đã thêm dòng');
            formApi.reset();
            onChanged?.();
          },
          onError: (err) => toast.error((err as Error).message || 'Thêm dòng thất bại'),
        },
      );
    },
  });

  const addDisease = () => {
    if (!diseaseId) return;
    addItem.mutate(
      { id: invoiceId, data: { sourceType: 'DISEASE', sourceRef: Number(diseaseId) } },
      {
        onSuccess: () => {
          toast.success('Đã thêm điều trị');
          setDiseaseId('');
          onChanged?.();
        },
        onError: (err) => toast.error((err as Error).message || 'Thêm thất bại'),
      },
    );
  };

  const addProduct = () => {
    if (!productId) return;
    addItem.mutate(
      {
        id: invoiceId,
        data: {
          sourceType: 'PRODUCT',
          sourceRef: Number(productId),
          quantity: productQty,
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã thêm hàng bán lẻ');
          setProductId('');
          setProductQty(1);
          onChanged?.();
        },
        onError: (err) => toast.error((err as Error).message || 'Thêm thất bại'),
      },
    );
  };

  return (
    <div className="space-y-5">
      {/* Bảng dòng chi phí */}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Loại</th>
              <th className="px-3 py-2 text-left">Nội dung</th>
              <th className="px-3 py-2 text-right">Đơn giá</th>
              <th className="px-3 py-2 text-center">SL</th>
              <th className="px-3 py-2 text-right">Thành tiền</th>
              {isOpen ? <th className="w-10 px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={isOpen ? 6 : 5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Chưa có dòng nào.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">
                    <Badge
                      variant="secondary"
                      className={ITEM_SOURCE_CLASS[it.sourceType ?? 'MISC']}
                    >
                      {ITEM_SOURCE_LABEL[it.sourceType ?? 'MISC']}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{it.description}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatVnd(it.unitPrice)}
                  </td>
                  <td className="px-3 py-2 text-center">{it.quantity}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {formatVnd(it.lineTotal)}
                  </td>
                  {isOpen ? (
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() =>
                          removeItem.mutate(
                            { id: invoiceId, itemId: it.id! },
                            {
                              onSuccess: () => onChanged?.(),
                              onError: (err) =>
                                toast.error((err as Error).message || 'Xoá thất bại'),
                            },
                          )
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={isOpen ? 4 : 3} className="px-3 py-2 text-right font-medium">
                Tổng cộng
              </td>
              <td className="px-3 py-2 text-right font-mono text-base font-bold">
                {formatVnd(invoice.total)}
              </td>
              {isOpen ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {isOpen ? (
        <>
          {showTreatmentAdd ? (
            /* Thêm điều trị từ danh mục bệnh */
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="text-xs font-semibold">Thêm điều trị (theo bệnh)</Label>
              <div className="flex gap-2">
                <select
                  value={diseaseId}
                  onChange={(e) => setDiseaseId(e.target.value)}
                  className="h-9 flex-1 rounded-md border bg-white px-2 text-sm"
                >
                  <option value="">— Chọn bệnh —</option>
                  {diseases.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({formatVnd(d.baseCost)})
                    </option>
                  ))}
                </select>
                <Button onClick={addDisease} disabled={!diseaseId || addItem.isPending}>
                  Thêm
                </Button>
              </div>
            </div>
          ) : null}

          {showRetailAdd ? (
            /* Thêm hàng bán lẻ từ catalog */
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="text-xs font-semibold">
                Thêm hàng bán lẻ (đồ chơi, thức ăn, phụ kiện)
              </Label>
              <div className="flex gap-2">
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="h-9 flex-1 rounded-md border bg-white px-2 text-sm"
                >
                  <option value="">— Chọn sản phẩm —</option>
                  {merchandise.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stockStatus === 'OUT'}>
                      {p.name} ({formatVnd(p.unitPrice)}
                      {p.unit ? `/${p.unit}` : ''}) — tồn {p.stockQuantity ?? 0}
                      {p.stockStatus === 'OUT' ? ' · hết hàng' : ''}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={productQty}
                  onChange={(e) => setProductQty(Number(e.target.value))}
                />
                <Button onClick={addProduct} disabled={!productId || addItem.isPending}>
                  Thêm
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Giá lấy theo catalog; tồn kho bị trừ khi thanh toán.
              </p>
            </div>
          ) : null}

          {/* Thêm dòng tự do (phụ phí ngoài catalog) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void miscForm.handleSubmit();
            }}
            className="space-y-2 rounded-lg border bg-muted/20 p-3"
          >
            <Label className="text-xs font-semibold">
              Thêm dòng khác (phụ phí ngoài catalog)
            </Label>
            <div className="grid grid-cols-[1fr_120px_70px_auto] gap-2">
              <miscForm.Field
                name="description"
                children={(field) => (
                  <Input
                    placeholder="Tên sản phẩm / phụ phí"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
              <miscForm.Field
                name="unitPrice"
                children={(field) => (
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Đơn giá"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                )}
              />
              <miscForm.Field
                name="quantity"
                children={(field) => (
                  <Input
                    type="number"
                    min="1"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                )}
              />
              <Button type="submit" disabled={addItem.isPending}>
                Thêm
              </Button>
            </div>
            <miscForm.Field
              name="description"
              children={(field) => <FieldError field={field} />}
            />
          </form>
        </>
      ) : null}
    </div>
  );
}
