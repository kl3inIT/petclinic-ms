import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Stethoscope } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getGetVisitQueryOptions } from '@/lib/api/generated/visits/visits';
import type { InvoiceResponse } from '@/lib/api/generated/model/invoiceResponse';

import { formatDateTime, formatVnd } from '../format';
import {
  INVOICE_STATUS_CLASS,
  INVOICE_STATUS_LABEL,
  ITEM_SOURCE_CLASS,
  ITEM_SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
} from '../labels';

interface Props {
  invoice: InvoiceResponse;
}

export function CustomerInvoiceHistoryCard({ invoice }: Props) {
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => invoice.items ?? [], [invoice.items]);
  const visitIds = useMemo(
    () => [
      ...new Set(
        items
          .filter((item) => item.sourceType === 'VISIT_FEE')
          .map((item) => item.sourceRef)
          .filter((id): id is number => id !== undefined),
      ),
    ],
    [items],
  );
  const visitQueries = useQueries({
    queries: visitIds.map((id) =>
      getGetVisitQueryOptions(id, {
        query: { enabled: expanded, staleTime: 5 * 60 * 1000 },
      }),
    ),
  });

  return (
    <article className="rounded-xl border border-[#ECECF5] bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">#{invoice.id}</span>
            <Badge className={INVOICE_STATUS_CLASS[invoice.status ?? 'PAID']}>
              {INVOICE_STATUS_LABEL[invoice.status ?? 'PAID']}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(invoice.paidAt ?? invoice.issuedAt)}
            {invoice.paymentMethod
              ? ` · ${PAYMENT_METHOD_LABEL[invoice.paymentMethod]}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">{formatVnd(invoice.total)}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
            {expanded ? 'Thu gọn' : 'Xem chi tiết'}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-5 border-t border-slate-100 pt-4">
          <section aria-label={`Chi tiết hoá đơn #${invoice.id}`}>
            <h4 className="font-bold text-slate-900">Chi tiết thanh toán</h4>
            {items.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Hoá đơn không có dòng chi phí.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Loại</th>
                      <th className="px-3 py-2 font-semibold">Nội dung</th>
                      <th className="px-3 py-2 text-right font-semibold">Đơn giá</th>
                      <th className="px-3 py-2 text-right font-semibold">SL</th>
                      <th className="px-3 py-2 text-right font-semibold">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr
                        key={item.id ?? `${item.sourceType}-${item.sourceRef}-${index}`}
                      >
                        <td className="px-3 py-2">
                          <Badge className={ITEM_SOURCE_CLASS[item.sourceType ?? 'MISC']}>
                            {ITEM_SOURCE_LABEL[item.sourceType ?? 'MISC']}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {item.description || 'Chi phí khác'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatVnd(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {item.quantity ?? 1}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {formatVnd(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-100 bg-slate-50/70">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-bold">
                        Tổng cộng
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black">
                        {formatVnd(invoice.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {visitIds.length > 0 ? (
            <section aria-label="Hồ sơ khám liên quan">
              <h4 className="flex items-center gap-2 font-bold text-slate-900">
                <Stethoscope className="size-4 text-violet-600" />
                Hồ sơ khám liên quan
              </h4>
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
                {visitQueries.map((query, index) => {
                  const visitId = visitIds[index];
                  const visit = query.data;
                  if (query.isLoading) {
                    return (
                      <div
                        key={visitId}
                        className="rounded-lg border border-slate-100 p-3 text-xs text-slate-500"
                      >
                        Đang tải hồ sơ khám #{visitId}…
                      </div>
                    );
                  }
                  if (!visit) {
                    return (
                      <div
                        key={visitId}
                        className="rounded-lg border border-rose-100 bg-rose-50/40 p-3 text-xs text-rose-700"
                      >
                        Không tải được hồ sơ khám #{visitId}.
                      </div>
                    );
                  }
                  return (
                    <div
                      key={visitId}
                      className="rounded-lg border border-violet-100 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">
                            {visit.petName ?? 'Thú cưng'} · Lần khám #{visit.id}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDateTime(visit.scheduledAt)}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-semibold text-violet-700">
                          {formatVnd(visit.fee)}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-xs">
                        <ClinicalField label="Lý do khám" value={visit.reason} />
                        <ClinicalField label="Chẩn đoán" value={visit.diagnosis} />
                        <ClinicalField label="Điều trị" value={visit.treatment} />
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ClinicalField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-700">{value || 'Chưa cập nhật'}</dd>
    </div>
  );
}
