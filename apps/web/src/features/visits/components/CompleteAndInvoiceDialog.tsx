import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError } from '@/lib/form/FieldError';

import { useCompleteVisit } from '@/lib/api/generated/visits/visits';
import { useCreatePrescription } from '@/lib/api/generated/prescriptions/prescriptions';
import { useGetInvoice, useListInvoices } from '@/lib/api/generated/invoices/invoices';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { useProducts } from '@/features/products/api';
import { useCreateInvoice } from '@/features/billing/api';
import { InvoiceItemsEditor } from '@/features/billing/components/InvoiceItemsEditor';
import { formatVnd } from '@/features/billing/format';
import { completeVisitSchema } from '../schemas';

interface Props {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
}

interface MedLine {
  productId: number; // 0 = free-text ngoài catalog
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  quantity: string;
  instructions: string;
}

function emptyLine(): MedLine {
  return {
    productId: 0,
    medicationName: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    quantity: '1',
    instructions: '',
  };
}

/**
 * Gộp hoàn tất khám + kê đơn + lập hoá đơn vào một luồng 2 bước cho VET.
 * Bước 1: chẩn đoán + dịch vụ (phí) + thuốc → completeVisit + createPrescription.
 * Bước 2: hoá đơn OPEN của khách (do event tự sinh phí khám + thuốc) — vet thêm/bớt dòng.
 * Vet KHÔNG thu tiền; quầy (STAFF/ADMIN) checkout sau ở /admin/invoices.
 */
export function CompleteAndInvoiceDialog({ visit, onOpenChange }: Props) {
  const open = visit !== null;
  const visitId = visit?.id;
  const [step, setStep] = useState<1 | 2>(1);

  // Mỗi lần mở cho visit mới → về bước 1.
  useEffect(() => {
    if (visitId != null) setStep(1);
  }, [visitId]);

  if (!visit?.id) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setStep(1);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        {step === 1 ? (
          <ExamStep
            visit={visit}
            onDone={() => setStep(2)}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <InvoiceStep visit={visit} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Bước 1: Khám & kê đơn ────────────────────────────────────────────────────

function ExamStep({
  visit,
  onDone,
  onCancel,
}: {
  visit: VisitResponse;
  onDone: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const visitId = visit.id!;

  const servicesQuery = useProducts({
    type: 'SERVICE',
    active: true,
    pageable: { page: 0, size: 50, sort: ['name,asc'] },
  });
  const services = servicesQuery.data?.content ?? [];

  const medsQuery = useProducts({
    type: 'MEDICATION',
    active: true,
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });
  const meds = medsQuery.data?.content ?? [];

  const complete = useCompleteVisit();
  const prescribe = useCreatePrescription();

  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<MedLine[]>([emptyLine()]);

  function patchLine(idx: number, patch: Partial<MedLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function selectProduct(idx: number, productId: number) {
    const med = meds.find((m) => m.id === productId);
    patchLine(idx, {
      productId,
      medicationName: med?.name ?? lines[idx]?.medicationName ?? '',
    });
  }

  const form = useForm({
    defaultValues: {
      diagnosis: visit.diagnosis ?? '',
      treatment: visit.treatment ?? '',
      fee: visit.fee ?? 0,
      serviceProductId: 0,
    },
    validators: { onChange: completeVisitSchema },
    onSubmit: async ({ value }) => {
      const hasService = value.serviceProductId > 0;
      // 1) Hoàn tất khám (phí khám → event sinh dòng VISIT_FEE).
      try {
        await complete.mutateAsync({
          id: visitId,
          data: {
            diagnosis: value.diagnosis,
            treatment: value.treatment || undefined,
            fee: hasService ? undefined : value.fee,
            serviceProductId: hasService ? value.serviceProductId : undefined,
          },
        });
      } catch (err) {
        toast.error((err as Error).message || 'Hoàn tất khám thất bại');
        return;
      }

      // 2) Kê đơn (nếu có dòng thuốc) → event sinh dòng MEDICATION.
      const items = lines
        .filter((l) => l.medicationName.trim().length > 0)
        .map((l) => {
          const fromCatalog = l.productId > 0;
          return {
            medicationName: l.medicationName.trim(),
            dosage: l.dosage.trim() || undefined,
            frequency: l.frequency.trim() || undefined,
            durationDays: l.durationDays ? Number(l.durationDays) : undefined,
            instructions: l.instructions.trim() || undefined,
            productId: fromCatalog ? l.productId : undefined,
            quantity: fromCatalog ? Number(l.quantity) || 1 : undefined,
          };
        });
      if (items.length > 0) {
        try {
          await prescribe.mutateAsync({
            visitId,
            data: { notes: notes.trim() || undefined, items },
          });
        } catch (err) {
          // Không chặn sang bước hoá đơn — chỉ báo lỗi kê đơn.
          toast.error('Kê đơn lỗi: ' + ((err as Error).message || 'thất bại'));
        }
      }

      void qc.invalidateQueries({ queryKey: ['/api/v1/visits'] });
      toast.success('Đã hoàn tất khám — sang lập hoá đơn');
      onDone();
    },
  });

  const busy = complete.isPending || prescribe.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Hoàn tất khám &amp; lập hoá đơn — visit #{visit.id}</DialogTitle>
        <DialogDescription>
          Bước 1/2 · {visit.petName ?? 'thú cưng'} · {visit.ownerName ?? 'khách'}. Ghi
          chẩn đoán, chọn dịch vụ khám và kê thuốc; bước sau sẽ lập hoá đơn.
        </DialogDescription>
      </DialogHeader>

      <form
        id="exam-step-form"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="max-h-[60vh] space-y-4 overflow-y-auto pr-1"
      >
        <form.Field
          name="diagnosis"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Chẩn đoán *</Label>
              <Textarea
                id={field.name}
                rows={2}
                placeholder="Vd: viêm da cơ địa…"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError field={field} />
            </div>
          )}
        />

        <form.Field
          name="treatment"
          children={(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Điều trị</Label>
              <Textarea
                id={field.name}
                rows={2}
                placeholder="Vd: kháng sinh 7 ngày, kem bôi…"
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
            name="serviceProductId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Dịch vụ khám (catalog)</Label>
                <select
                  id={field.name}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={field.state.value}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    field.handleChange(id);
                    const svc = services.find((s) => s.id === id);
                    if (svc?.unitPrice != null) form.setFieldValue('fee', svc.unitPrice);
                  }}
                >
                  <option value={0}>— Nhập phí tay —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatVnd(s.unitPrice)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          />
          <form.Subscribe
            selector={(s) => s.values.serviceProductId}
            children={(serviceProductId) => (
              <form.Field
                name="fee"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Chi phí khám (VND)</Label>
                    <Input
                      id={field.name}
                      type="number"
                      min={0}
                      step="1000"
                      readOnly={serviceProductId > 0}
                      value={field.state.value ?? 0}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                    />
                    <FieldError field={field} />
                  </div>
                )}
              />
            )}
          />
        </div>

        {/* Thuốc */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Đơn thuốc (tuỳ chọn)</Label>
          {lines.map((line, idx) => {
            const fromCatalog = line.productId > 0;
            return (
              <div key={idx} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Dòng {idx + 1}
                  </span>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Thuốc (catalog)</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      value={line.productId}
                      onChange={(e) => selectProduct(idx, Number(e.target.value))}
                    >
                      <option value={0}>— Nhập tay (ngoài catalog) —</option>
                      {meds.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatVnd(m.unitPrice)}
                          {m.unit ? `/${m.unit}` : ''}) — tồn {m.stockQuantity ?? 0}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tên thuốc</Label>
                    <Input
                      value={line.medicationName}
                      readOnly={fromCatalog}
                      placeholder="Amoxicillin 500mg"
                      onChange={(e) => patchLine(idx, { medicationName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Liều</Label>
                    <Input
                      value={line.dosage}
                      placeholder="250mg"
                      onChange={(e) => patchLine(idx, { dosage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tần suất</Label>
                    <Input
                      value={line.frequency}
                      placeholder="2 lần/ngày"
                      onChange={(e) => patchLine(idx, { frequency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Số ngày</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.durationDays}
                      onChange={(e) => patchLine(idx, { durationDays: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>SL {fromCatalog ? '*' : '(tính tiền)'}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      disabled={!fromCatalog}
                      onChange={(e) => patchLine(idx, { quantity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Hướng dẫn</Label>
                  <Input
                    value={line.instructions}
                    placeholder="Uống sau ăn"
                    onChange={(e) => patchLine(idx, { instructions: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((p) => [...p, emptyLine()])}
          >
            <Plus className="size-4" /> Thêm dòng thuốc
          </Button>
          <div className="space-y-1">
            <Label htmlFor="rx-notes">Ghi chú đơn</Label>
            <Textarea
              id="rx-notes"
              rows={2}
              value={notes}
              placeholder="Ghi chú chung cho đơn thuốc…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Hủy
        </Button>
        <Button type="submit" form="exam-step-form" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Tiếp tục — lập hoá đơn'}
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Bước 2: Hoá đơn ──────────────────────────────────────────────────────────

function InvoiceStep({ visit, onClose }: { visit: VisitResponse; onClose: () => void }) {
  const createInvoice = useCreateInvoice();

  // Tìm tab OPEN của khách (event sinh sau khi hoàn tất khám) — poll cho tới khi có.
  const listQuery = useListInvoices(
    {
      customerUserId: visit.customerUserId,
      status: 'OPEN',
      pageable: { page: 0, size: 1, sort: ['issuedAt,desc'] },
    },
    {
      query: {
        refetchInterval: (q) => ((q.state.data?.content?.length ?? 0) > 0 ? false : 1500),
      },
    },
  );
  const invoiceId = listQuery.data?.content?.[0]?.id;

  // Chi tiết hoá đơn — poll cho tới khi thấy dòng phí khám (VISIT_FEE) tới qua event.
  const detailQuery = useGetInvoice(invoiceId ?? 0, {
    query: {
      enabled: invoiceId != null,
      refetchInterval: (q) => {
        const inv = q.state.data;
        const hasFee = inv?.items?.some((it) => it.sourceType === 'VISIT_FEE');
        return hasFee ? false : 1500;
      },
    },
  });
  const invoice = detailQuery.data;

  const refreshAll = () => {
    void listQuery.refetch();
    void detailQuery.refetch();
  };

  // Fallback: events chậm/tắt → cho phép mở tab thủ công (idempotent theo OPEN-per-customer).
  const noInvoiceYet =
    listQuery.isSuccess && (listQuery.data?.content?.length ?? 0) === 0;
  const openManually = () => {
    createInvoice.mutate(
      {
        data: {
          customerUserId: visit.customerUserId,
          customerName: visit.ownerName || undefined,
        },
      },
      {
        onSuccess: () => refreshAll(),
        onError: (err) => toast.error((err as Error).message || 'Mở hoá đơn thất bại'),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Hoá đơn — visit #{visit.id}</DialogTitle>
        <DialogDescription>
          Bước 2/2 · {visit.ownerName ?? 'khách'}. Phí khám &amp; thuốc tự đổ vào hoá đơn;
          thêm/bớt dòng nếu cần. <strong>Vet không thu tiền</strong> — quầy sẽ thanh toán.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {invoice
              ? `Hoá đơn #${invoice.id}`
              : 'Đang đồng bộ phí khám/thuốc từ hệ thống…'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="size-4" /> Làm mới
          </Button>
        </div>

        {!invoice ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            {noInvoiceYet ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3 text-sm">
                <span className="text-muted-foreground">
                  Chưa thấy hoá đơn được tạo tự động.
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={openManually}
                  disabled={createInvoice.isPending}
                >
                  Mở hoá đơn thủ công
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <InvoiceItemsEditor
              invoice={invoice}
              onChanged={refreshAll}
              showRetailAdd={false}
            />
            <div className="flex items-center justify-between rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
              <span className="text-sm font-medium">Tổng cộng</span>
              <span className="font-mono text-lg font-bold">
                {formatVnd(invoice.total)}
              </span>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Hoàn tất — chuyển quầy thu tiền
        </Button>
      </DialogFooter>
    </>
  );
}
