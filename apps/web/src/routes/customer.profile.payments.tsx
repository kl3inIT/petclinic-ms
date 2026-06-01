import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import {
  CreditCard,
  MoreHorizontal,
  Plus,
  Receipt,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/lib/form/FieldError';

import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import {
  type PaymentMethod,
  usePersistedState,
} from '@/features/customer-profile/preferences';
import { type InvoiceResponse, useMyInvoices } from '@/features/billing/api';
import { formatDateTime, formatVnd } from '@/features/billing/format';
import {
  INVOICE_STATUS_CLASS,
  INVOICE_STATUS_LABEL,
  ITEM_SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@/features/billing/labels';

export const Route = createFileRoute('/customer/profile/payments')({
  component: PaymentsPage,
});

const paymentSchema = z.object({
  brand: z.enum(['visa', 'mastercard', 'jcb', 'momo', 'vnpay']),
  cardNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{12,19}$/u, '12-19 chữ số'),
  holderName: z.string().trim().min(2, 'Tối thiểu 2 ký tự').max(60),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2026).max(2050),
});

function PaymentsPage() {
  const [methods, setMethods] = usePersistedState<PaymentMethod[]>(
    'petclinic.customer.payments',
    [],
  );
  const [formOpen, setFormOpen] = useState(false);

  const addMethod = (m: Omit<PaymentMethod, 'id' | 'isDefault'>) => {
    const created: PaymentMethod = {
      id: crypto.randomUUID(),
      brand: m.brand,
      last4: m.last4,
      holderName: m.holderName,
      expMonth: m.expMonth,
      expYear: m.expYear,
      isDefault: true,
    };
    setMethods((prev) => [
      ...prev.map((p): PaymentMethod => ({ ...p, isDefault: false })),
      created,
    ]);
  };

  const setDefault = (id: string) =>
    setMethods((prev) =>
      prev.map((p): PaymentMethod => ({ ...p, isDefault: p.id === id })),
    );

  const remove = (id: string) =>
    setMethods((prev) => {
      const removed = prev.find((p) => p.id === id);
      const rest = prev.filter((p) => p.id !== id);
      // Default tự chuyển sang phương thức đầu nếu xoá default.
      if (removed?.isDefault && rest.length > 0 && rest[0]) {
        const first: PaymentMethod = { ...rest[0], isDefault: true };
        rest[0] = first;
      }
      return rest;
    });

  return (
    <>
      <ProfilePageHeader
        title="Phương thức thanh toán"
        subtitle="Quản lý thẻ và ví điện tử dùng để thanh toán hoá đơn khám bệnh."
        actions={
          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-xl bg-[#7C6CF5] font-black shadow-[0_12px_28px_rgba(124,108,245,0.28)] hover:bg-[#6D5CE8]"
          >
            <Plus /> Thêm phương thức
          </Button>
        }
      />

      <MyInvoicesSection />

      <ProfileCard className="bg-gradient-to-r from-amber-50 via-white to-rose-50">
        <CardTitleRow
          icon={ShieldCheck}
          title="Bản demo — chưa kết nối cổng thanh toán thật"
          description="Dữ liệu lưu local trên trình duyệt. Không nhập số thẻ thật. Production sẽ tích hợp Stripe / VNPay / Momo qua Marketplace Vercel hoặc gateway riêng."
        />
      </ProfileCard>

      <ProfileCard>
        <CardTitleRow icon={CreditCard} title="Phương thức của tôi" />
        {methods.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 py-12 text-center">
            <CreditCard className="size-12 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Chưa có phương thức nào</p>
            <p className="text-xs font-medium text-slate-500">
              Thêm thẻ tín dụng hoặc ví điện tử để thanh toán nhanh chóng.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {methods.map((m) => (
              <PaymentMethodRow
                key={m.id}
                method={m}
                onSetDefault={() => setDefault(m.id)}
                onRemove={() => {
                  remove(m.id);
                  toast.success('Đã xóa phương thức');
                }}
              />
            ))}
          </ul>
        )}
      </ProfileCard>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(value) => {
          addMethod({
            brand: value.brand,
            last4: value.cardNumber.slice(-4),
            holderName: value.holderName.toUpperCase(),
            expMonth: value.expMonth,
            expYear: value.expYear,
          });
          setFormOpen(false);
          toast.success('Đã thêm phương thức thanh toán');
        }}
      />
    </>
  );
}

function MyInvoicesSection() {
  const { data, isLoading } = useMyInvoices();
  const invoices = data?.content ?? [];
  const openInvoice = invoices.find((i) => i.status === 'OPEN');
  const history = invoices.filter((i) => i.status !== 'OPEN');

  return (
    <ProfileCard>
      <CardTitleRow
        icon={Receipt}
        title="Hoá đơn của tôi"
        description="Mọi chi phí khám + điều trị + đồ mua tại cửa hàng được gộp vào một hoá đơn, thanh toán một lần ở quầy."
      />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Đang tải…</p>
      ) : invoices.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 py-10 text-center">
          <Receipt className="size-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Chưa có hoá đơn nào</p>
          <p className="text-xs font-medium text-slate-500">
            Hoá đơn sẽ xuất hiện sau khi bạn hoàn tất một lần khám.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {openInvoice ? <OpenInvoiceCard invoice={openInvoice} /> : null}
          {history.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Lịch sử</p>
              {history.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border border-[#ECECF5] bg-white p-3 text-sm"
                >
                  <div>
                    <span className="font-mono font-semibold">#{inv.id}</span>
                    <span className="ml-2 text-slate-500">
                      {formatDateTime(inv.paidAt ?? inv.issuedAt)}
                    </span>
                    {inv.paymentMethod ? (
                      <span className="ml-2 text-xs text-slate-400">
                        {PAYMENT_METHOD_LABEL[inv.paymentMethod]}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold">
                      {formatVnd(inv.total)}
                    </span>
                    <Badge className={INVOICE_STATUS_CLASS[inv.status ?? 'PAID']}>
                      {INVOICE_STATUS_LABEL[inv.status ?? 'PAID']}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </ProfileCard>
  );
}

function OpenInvoiceCard({ invoice }: { invoice: InvoiceResponse }) {
  const items = invoice.items ?? [];
  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-slate-900">Hoá đơn đang mở #{invoice.id}</p>
        <Badge className={INVOICE_STATUS_CLASS.OPEN}>{INVOICE_STATUS_LABEL.OPEN}</Badge>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-slate-700">
              <span className="mr-1 text-xs text-slate-400">
                [{ITEM_SOURCE_LABEL[it.sourceType ?? 'MISC']}]
              </span>
              {it.description}
              {(it.quantity ?? 1) > 1 ? ` ×${it.quantity}` : ''}
            </span>
            <span className="font-mono font-medium">{formatVnd(it.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3">
        <span className="text-sm font-bold">Tổng cộng</span>
        <span className="font-mono text-base font-black text-slate-900">
          {formatVnd(invoice.total)}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Thanh toán tại quầy khi bạn hoàn tất. Nhân viên sẽ chốt hoá đơn này.
      </p>
    </div>
  );
}

function PaymentMethodRow({
  method,
  onSetDefault,
  onRemove,
}: {
  method: PaymentMethod;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-[#ECECF5] bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        <BrandTile brand={method.brand} />
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">
            {brandLabel(method.brand)} •••• {method.last4}
            {method.isDefault ? (
              <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Mặc định
              </Badge>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Chủ thẻ {method.holderName}
            {method.expMonth && method.expYear
              ? ` • Hết hạn ${String(method.expMonth).padStart(2, '0')}/${method.expYear % 100}`
              : ''}
          </p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!method.isDefault ? (
            <DropdownMenuItem onSelect={onSetDefault}>
              <Star className="size-4" /> Đặt làm mặc định
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            <Trash2 className="size-4" /> Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function BrandTile({ brand }: { brand: PaymentMethod['brand'] }) {
  const palette: Record<PaymentMethod['brand'], string> = {
    visa: 'bg-blue-100 text-blue-700',
    mastercard: 'bg-orange-100 text-orange-700',
    jcb: 'bg-violet-100 text-violet-700',
    momo: 'bg-pink-100 text-pink-700',
    vnpay: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-[10px] font-black uppercase shadow-sm ${palette[brand]}`}
    >
      {brand}
    </span>
  );
}

function brandLabel(brand: PaymentMethod['brand']): string {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'jcb':
      return 'JCB';
    case 'momo':
      return 'MoMo';
    case 'vnpay':
      return 'VNPay';
  }
}

function PaymentFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: z.infer<typeof paymentSchema>) => void;
}) {
  const currentYear = new Date().getFullYear();
  const form = useForm({
    defaultValues: {
      brand: 'visa' as PaymentMethod['brand'],
      cardNumber: '',
      holderName: '',
      expMonth: 1,
      expYear: currentYear + 1,
    },
    validators: { onChange: paymentSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm phương thức thanh toán</DialogTitle>
          <DialogDescription>
            Dữ liệu lưu local trên trình duyệt — không nhập số thẻ thật.
          </DialogDescription>
        </DialogHeader>

        <form
          id="payment-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="brand"
            children={(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Loại</Label>
                <select
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value as PaymentMethod['brand'])
                  }
                  className="h-10 w-full rounded-lg border border-[#ECECF5] bg-white px-3 text-sm font-semibold"
                >
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="jcb">JCB</option>
                  <option value="momo">MoMo</option>
                  <option value="vnpay">VNPay</option>
                </select>
              </div>
            )}
          />
          <form.Field
            name="cardNumber"
            children={(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Số thẻ (12-19 chữ số)</Label>
                <Input
                  id={field.name}
                  inputMode="numeric"
                  placeholder="4242424242424242"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <form.Field
            name="holderName"
            children={(field) => (
              <div className="space-y-1.5">
                <Label htmlFor={field.name}>Tên chủ thẻ</Label>
                <Input
                  id={field.name}
                  placeholder="NGUYEN VAN A"
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
              name="expMonth"
              children={(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Tháng hết hạn</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min="1"
                    max="12"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="expYear"
              children={(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Năm hết hạn</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min={currentYear}
                    max="2050"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
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
          <Button type="submit" form="payment-form">
            Lưu phương thức
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
