import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pill, Plus, Trash2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

import { useCreatePrescription } from '@/lib/api/generated/prescriptions/prescriptions';
import type { IdempotentPrescriptionRequest } from '@/features/visits/prescription-command';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { useProducts } from '@/features/products/api';
import { formatVnd } from '@/features/billing/format';

interface Props {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
}

interface LineDraft {
  productId: number; // 0 = free-text ngoài catalog
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  quantity: string;
  instructions: string;
}

const FREQUENCY_OPTIONS = [
  '1 lần/ngày',
  '2 lần/ngày',
  '3 lần/ngày',
  '4 lần/ngày',
  'Khi cần',
];
const NOTES_MAX = 500;

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

function emptyLine(): LineDraft {
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

export function PrescriptionDialog({ visit, onOpenChange }: Props) {
  const qc = useQueryClient();
  const open = visit !== null;
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, [visit?.id]);

  const medsQuery = useProducts({
    type: 'MEDICATION',
    active: true,
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });
  const meds = medsQuery.data?.content ?? [];

  const createMutation = useCreatePrescription({
    mutation: {
      onSuccess: () => {
        toast.success('Đã kê đơn thuốc');
        void qc.invalidateQueries({ queryKey: ['/api/v1/visits'] });
        setNotes('');
        setLines([emptyLine()]);
        idempotencyKey.current = crypto.randomUUID();
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Kê đơn thất bại'),
    },
  });

  function patchLine(idx: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : [emptyLine()],
    );
  }

  function selectProduct(idx: number, productId: number) {
    const med = meds.find((m) => m.id === productId);
    patchLine(idx, {
      productId,
      medicationName: med?.name ?? lines[idx]?.medicationName ?? '',
    });
  }

  function submit() {
    if (visit?.id == null) return;
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
    if (items.length === 0) {
      toast.error('Cần ít nhất 1 dòng thuốc có tên');
      return;
    }
    const command: IdempotentPrescriptionRequest = {
      notes: notes.trim() || undefined,
      items,
      idempotencyKey: idempotencyKey.current,
    };
    createMutation.mutate({
      visitId: visit.id,
      data: command,
    });
  }

  if (!visit?.id) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kê đơn thuốc — visit #{visit.id}</DialogTitle>
          <DialogDescription>
            Chọn thuốc từ catalog (tự tính tiền + trừ kho) hoặc nhập tay (chỉ ghi lâm
            sàng). Thuốc catalog sẽ tự đổ vào hoá đơn của khách.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {lines.map((line, idx) => {
            const fromCatalog = line.productId > 0;
            return (
              <div key={idx} className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Pill className="size-4" />
                    Thông tin thuốc {lines.length > 1 ? `#${idx + 1}` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Thuốc (catalog)</Label>
                    <select
                      className={selectClass}
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
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Tên thuốc *</Label>
                    <Input
                      value={line.medicationName}
                      readOnly={fromCatalog}
                      placeholder="Amoxicillin 500mg"
                      onChange={(e) => patchLine(idx, { medicationName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                    <select
                      className={selectClass}
                      value={line.frequency}
                      onChange={(e) => patchLine(idx, { frequency: e.target.value })}
                    >
                      <option value="">— Chọn —</option>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Số ngày</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.durationDays}
                      placeholder="7"
                      onChange={(e) => patchLine(idx, { durationDays: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>SL {fromCatalog ? '(trừ kho)' : ''}</Label>
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
              rows={3}
              maxLength={NOTES_MAX}
              value={notes}
              placeholder="Ghi chú chung cho đơn thuốc…"
              onChange={(e) => setNotes(e.target.value)}
            />
            <p
              className={cn(
                'text-right text-xs text-muted-foreground',
                notes.length >= NOTES_MAX && 'text-destructive',
              )}
            >
              {notes.length} / {NOTES_MAX}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={createMutation.isPending}>
            <Pill className="size-4" />
            {createMutation.isPending ? 'Đang lưu…' : 'Kê đơn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
