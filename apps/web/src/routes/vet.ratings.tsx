import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, MessageSquareQuote, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyRatings, useMyRatingsSummary } from '@/features/vet-me/api';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { StarRating } from '@/features/vet-me/components/StarRating';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';

export const Route = createFileRoute('/vet/ratings')({
  component: VetRatingsPage,
});

function VetRatingsPage() {
  const [page, setPage] = useState(0);
  const summaryQuery = useMyRatingsSummary();
  const listQuery = useMyRatings(page);

  const distribution = useMemo(() => {
    const dist = summaryQuery.data?.distribution ?? {};
    const total = summaryQuery.data?.count ?? 0;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: dist[star.toString()] ?? 0,
      percent: total === 0 ? 0 : ((dist[star.toString()] ?? 0) / total) * 100,
    }));
  }, [summaryQuery.data]);

  return (
    <div className="relative space-y-5 overflow-hidden rounded-xl bg-[#fbfaff] p-3 sm:p-5 lg:p-6">
      <VetPageHeader
        icon={MessageSquareQuote}
        title="Đánh giá khách hàng"
        subtitle="Tổng hợp đánh giá khách dành cho bạn. Nội dung hiển thị nguyên gốc."
      />

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-6 md:border-r md:border-b-0 md:pr-6 md:pb-0">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-24 w-24 rounded-xl" />
            ) : (
              <>
                <div className="text-5xl font-bold text-slate-950 tabular-nums">
                  {summaryQuery.data?.average == null
                    ? '-'
                    : summaryQuery.data.average.toFixed(1)}
                </div>
                <div className="mt-2">
                  <StarRating
                    score={Math.round(summaryQuery.data?.average ?? 0)}
                    size="md"
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500">
                  {summaryQuery.data?.count ?? 0} lượt đánh giá
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            {summaryQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))
              : distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex w-12 shrink-0 items-center gap-1 font-semibold text-slate-700">
                      <span className="tabular-nums">{d.star}</span>
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-amber-400 transition-all"
                        style={{ width: `${d.percent}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs text-slate-500 tabular-nums">
                      {d.count}
                    </span>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader className="border-b border-slate-100 px-5 py-4">
          <CardTitle className="text-base font-bold text-slate-950">
            Tất cả đánh giá
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {listQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (listQuery.data?.content?.length ?? 0) === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="Chưa có đánh giá nào"
              description="Khi khách hàng đánh giá dịch vụ của bạn, đánh giá sẽ xuất hiện ở đây."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {(listQuery.data?.content ?? []).map((r) => (
                <div key={r.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600 uppercase">
                        {(r.customerName ?? '?').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-950">
                          {r.customerName ?? '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.rateDate
                            ? new Date(r.rateDate).toLocaleString('vi-VN')
                            : '-'}
                        </div>
                      </div>
                    </div>
                    <StarRating score={r.score ?? 0} size="md" />
                  </div>
                  {r.description && (
                    <p className="pl-[3.25rem] text-sm leading-6 text-slate-500">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {listQuery.data && (listQuery.data.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-violet-200 text-violet-700 hover:bg-violet-50"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Trước
          </Button>
          <span className="text-sm text-slate-500">
            Trang {page + 1} / {listQuery.data.totalPages ?? 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-violet-200 text-violet-700 hover:bg-violet-50"
            disabled={page + 1 >= (listQuery.data.totalPages ?? 1)}
            onClick={() =>
              setPage((p) => (p + 1 < (listQuery.data?.totalPages ?? 1) ? p + 1 : p))
            }
          >
            Sau
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
