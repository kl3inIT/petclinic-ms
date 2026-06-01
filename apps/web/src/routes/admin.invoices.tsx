import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Plus, Receipt, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/lib/form/FieldError';

import { useGetInvoice } from '@/lib/api/generated/invoices/invoices';
import {
  type InvoiceResponse,
  useAddInvoiceItem,
  useCancelInvoice,
  useCheckoutInvoice,
  useCreateInvoice,
  useDiseases,
  useInvoices,
  useRemoveInvoiceItem,
} from '@/features/billing/api';
import { formatDateTime, formatVnd } from '@/features/billing/format';
import { miscItemFormSchema } from '@/features/billing/schemas';
import {
  INVOICE_STATUS_CLASS,
  INVOICE_STATUS_LABEL,
  ITEM_SOURCE_CLASS,
  ITEM_SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@/features/billing/labels';
import type {
  CheckoutRequestPaymentMethod,
  ListInvoicesStatus,
} from '@/lib/api/generated/model';

export const Route = createFileRoute('/admin/invoices')({
  component: InvoicesAdminPage,
});

const STATUS_TABS: ListInvoicesStatus[] = ['OPEN', 'PAID', 'CANCELLED'];

function InvoicesAdminPage() {
  const [status, setStatus] = useState<ListInvoicesStatus>('OPEN');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = useInvoices({
    status,
    pageable: { page: 0, size: 50, sort: ['issuedAt,desc'] },
  });
  const invoices = listQuery.data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Hoá đơn — Quầy thu ngân</h1>
            <p className="text-sm text-muted-foreground">
              Gộp phí khám + điều trị + đồ shop vào một hoá đơn, thanh toán một lần.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Mở hoá đơn mới
        </Button>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatus(s);
              setSelectedId(null);
            }}
          >
            {INVOICE_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Danh sách hoá đơn */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {INVOICE_STATUS_LABEL[status]} ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {listQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : invoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không có hoá đơn.
              </p>
            ) : (
              invoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id ?? null)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === inv.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">#{inv.id}</span>
                    <Badge className={INVOICE_STATUS_CLASS[inv.status ?? 'OPEN']}>
                      {INVOICE_STATUS_LABEL[inv.status ?? 'OPEN']}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm">
                    {inv.customerName || 'Khách lẻ'}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDateTime(inv.issuedAt)}</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatVnd(inv.total)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Chi tiết / POS */}
        {selectedId == null ? (
          <Card className="flex items-center justify-center">
            <p className="py-20 text-sm text-muted-foreground">
              Chọn một hoá đơn để xem chi tiết.
            </p>
          </Card>
        ) : (
          <InvoiceDetailPanel invoiceId={selectedId} />
        )}
      </div>

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setStatus('OPEN');
          setSelectedId(id);
        }}
      />
    </div>
  );
}

function InvoiceDetailPanel({ invoiceId }: { invoiceId: number }) {
  const detailQuery = useGetInvoice(invoiceId);
  const invoice = detailQuery.data;

  if (detailQuery.isLoading || !invoice) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return <InvoiceDetailContent invoice={invoice} />;
}

function InvoiceDetailContent({ invoice }: { invoice: InvoiceResponse }) {
  const isOpen = invoice.status === 'OPEN';
  const invoiceId = invoice.id!;
  const diseasesQuery = useDiseases({
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });
  const diseases = (diseasesQuery.data?.content ?? []).filter((d) => d.active);

  const addItem = useAddInvoiceItem();
  const removeItem = useRemoveInvoiceItem();
  const checkout = useCheckoutInvoice();
  const cancel = useCancelInvoice();

  const [diseaseId, setDiseaseId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutRequestPaymentMethod>('CASH');

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
        },
        onError: (err) => toast.error((err as Error).message || 'Thêm thất bại'),
      },
    );
  };

  const items = invoice.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Hoá đơn #{invoice.id} · {invoice.customerName || 'Khách lẻ'}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Mở: {formatDateTime(invoice.issuedAt)}
              {invoice.paidAt
                ? ` · Thanh toán: ${formatDateTime(invoice.paidAt)} (${
                    invoice.paymentMethod
                      ? PAYMENT_METHOD_LABEL[invoice.paymentMethod]
                      : ''
                  })`
                : ''}
            </p>
          </div>
          <Badge className={INVOICE_STATUS_CLASS[invoice.status ?? 'OPEN']}>
            {INVOICE_STATUS_LABEL[invoice.status ?? 'OPEN']}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
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
            {/* Thêm điều trị từ danh mục bệnh */}
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

            {/* Thêm dòng tự do (đồ shop / phụ phí) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void miscForm.handleSubmit();
              }}
              className="space-y-2 rounded-lg border bg-muted/20 p-3"
            >
              <Label className="text-xs font-semibold">
                Thêm dòng khác (đồ shop / phụ phí)
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

            {/* Thanh toán / huỷ */}
            <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as CheckoutRequestPaymentMethod)
                  }
                  className="h-9 rounded-md border bg-white px-2 text-sm"
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="CARD">Thẻ</option>
                  <option value="TRANSFER">Chuyển khoản</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    cancel.mutate(
                      { id: invoiceId },
                      {
                        onSuccess: () => toast.success('Đã huỷ hoá đơn'),
                        onError: (err) =>
                          toast.error((err as Error).message || 'Huỷ thất bại'),
                      },
                    )
                  }
                  disabled={cancel.isPending}
                >
                  Huỷ hoá đơn
                </Button>
                <Button
                  onClick={() =>
                    checkout.mutate(
                      { id: invoiceId, data: { paymentMethod } },
                      {
                        onSuccess: () =>
                          toast.success(`Đã thanh toán ${formatVnd(invoice.total)}`),
                        onError: (err) =>
                          toast.error((err as Error).message || 'Thanh toán thất bại'),
                      },
                    )
                  }
                  disabled={checkout.isPending || items.length === 0}
                >
                  Thanh toán {formatVnd(invoice.total)}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CreateInvoiceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: number) => void;
}) {
  const createInvoice = useCreateInvoice();
  const form = useForm({
    defaultValues: { customerName: '' },
    onSubmit: ({ value, formApi }) => {
      createInvoice.mutate(
        { data: { customerName: value.customerName.trim() || undefined } },
        {
          onSuccess: (inv) => {
            toast.success('Đã mở hoá đơn');
            formApi.reset();
            onOpenChange(false);
            if (inv.id != null) onCreated(inv.id);
          },
          onError: (err) => toast.error((err as Error).message || 'Mở hoá đơn thất bại'),
        },
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mở hoá đơn mới</DialogTitle>
          <DialogDescription>
            Tạo hoá đơn trống ở quầy cho khách lẻ (mua đồ shop, dịch vụ ngoài lịch khám).
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-invoice-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="customerName"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tên khách (tuỳ chọn)</Label>
                <Input
                  id={field.name}
                  placeholder="Nguyễn Văn A"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="create-invoice-form"
            disabled={createInvoice.isPending}
          >
            Mở hoá đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
