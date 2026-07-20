import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Plus, Receipt, Wallet } from 'lucide-react';
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

import { useGetInvoice } from '@/lib/api/generated/invoices/invoices';
import {
  type InvoiceResponse,
  useCancelInvoice,
  useCheckoutInvoice,
  useCreateInvoice,
  useInvoices,
} from '@/features/billing/api';
import { InvoiceItemsEditor } from '@/features/billing/components/InvoiceItemsEditor';
import { formatDateTime, formatVnd } from '@/features/billing/format';
import {
  INVOICE_STATUS_CLASS,
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@/features/billing/labels';
import type {
  CheckoutRequestPaymentMethod,
  ListInvoicesStatus,
} from '@/lib/api/generated/model';

export const Route = createFileRoute('/admin/invoices')({
  component: InvoicesPage,
});

const STATUS_TABS: ListInvoicesStatus[] = ['OPEN', 'PAID', 'CANCELLED'];

export function InvoicesPage() {
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

  return (
    <InvoiceDetailContent
      invoice={invoice}
      onChanged={() => void detailQuery.refetch()}
    />
  );
}

function InvoiceDetailContent({
  invoice,
  onChanged,
}: {
  invoice: InvoiceResponse;
  onChanged: () => void;
}) {
  const isOpen = invoice.status === 'OPEN';
  const invoiceId = invoice.id!;
  const items = invoice.items ?? [];

  const checkout = useCheckoutInvoice();
  const cancel = useCancelInvoice();
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutRequestPaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const trimmedPaymentReference = paymentReference.trim();
  const referenceRequired = paymentMethod === 'TRANSFER';
  const canCheckout =
    items.length > 0 && (!referenceRequired || trimmedPaymentReference.length > 0);

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
        <InvoiceItemsEditor
          invoice={invoice}
          onChanged={onChanged}
          showTreatmentAdd={false}
        />

        {isOpen ? (
          /* Thanh toán / huỷ — quầy STAFF, ADMIN có quyền override */
          <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-2 sm:grid-cols-[180px_minmax(220px,1fr)]">
              <div className="space-y-1">
                <Label className="text-xs">Phương thức</Label>
                <div className="flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const next = e.target.value as CheckoutRequestPaymentMethod;
                      setPaymentMethod(next);
                      if (next === 'CASH') {
                        setPaymentReference('');
                      }
                    }}
                    className="h-9 rounded-md border bg-white px-2 text-sm"
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="CARD">Thẻ</option>
                    <option value="TRANSFER">Chuyển khoản</option>
                  </select>
                </div>
              </div>
              {paymentMethod !== 'CASH' ? (
                <div className="space-y-1">
                  <Label htmlFor="payment-reference" className="text-xs">
                    Mã tham chiếu{referenceRequired ? ' *' : ''}
                  </Label>
                  <Input
                    id="payment-reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={
                      referenceRequired ? 'Bắt buộc với chuyển khoản' : 'Mã giao dịch thẻ'
                    }
                    maxLength={120}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  cancel.mutate(
                    { id: invoiceId },
                    {
                      onSuccess: () => {
                        toast.success('Đã huỷ hoá đơn');
                        onChanged();
                      },
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
                    {
                      id: invoiceId,
                      data: {
                        paymentMethod,
                        ...(trimmedPaymentReference
                          ? { paymentReference: trimmedPaymentReference }
                          : {}),
                      },
                    },
                    {
                      onSuccess: () => {
                        toast.success(`Đã thanh toán ${formatVnd(invoice.total)}`);
                        onChanged();
                      },
                      onError: (err) =>
                        toast.error((err as Error).message || 'Thanh toán thất bại'),
                    },
                  )
                }
                disabled={checkout.isPending || !canCheckout}
              >
                Thanh toán {formatVnd(invoice.total)}
              </Button>
            </div>
          </div>
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
