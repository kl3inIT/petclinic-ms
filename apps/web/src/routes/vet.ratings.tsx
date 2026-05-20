import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, MessageSquareQuote, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyRatings, useMyRatingsSummary } from '@/features/vet-me/api';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { StarRating } from '@/features/vet-me/components/StarRating';

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
    <div className="space-y-6">
      <VetPageHeader
        icon={MessageSquareQuote}
        title="Đánh giá khách hàng"
        subtitle="Tổng hợp đánh giá khách dành cho bạn. Nội dung hiển thị nguyên gốc."
      />

      {/* Summary */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-6 py-6 md:grid-cols-[200px_1fr]">
          {/* Big score */}
          <div className="flex flex-col items-center justify-center border-b pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-20 w-20" />
            ) : (
              <>
                <div className="text-5xl font-semibold tabular-nums">
                  {summaryQuery.data?.average == null
                    ? '—'
                    : summaryQuery.data.average.toFixed(1)}
                </div>
                <StarRating
                  score={Math.round(summaryQuery.data?.average ?? 0)}
                  size="md"
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {summaryQuery.data?.count ?? 0} lượt đánh giá
                </div>
              </>
            )}
          </div>

          {/* Distribution bars */}
          <div className="space-y-1.5">
            {summaryQuery.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))
              : distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex w-12 shrink-0 items-center gap-1">
                      <span className="tabular-nums">{d.star}</span>
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-amber-400 transition-all"
                        style={{ width: `${d.percent}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {d.count}
                    </span>
                  </div>
                ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tất cả đánh giá</CardTitle>
        </CardHeader>
        <CardContent>
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
              description="Khi khách hàng đánh giá dịch vụ của bạn, các đánh giá sẽ xuất hiện ở đây."
            />
          ) : (
            <div className="divide-y">
              {(listQuery.data?.content ?? []).map((r) => (
                <div key={r.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
                        {(r.customerName ?? '?').charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{r.customerName ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.rateDate ? new Date(r.rateDate).toLocaleString('vi-VN') : '—'}
                        </div>
                      </div>
                    </div>
                    <StarRating score={r.score ?? 0} size="md" />
                  </div>
                  {r.description && (
                    <p className="ml-12 text-sm leading-relaxed text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {listQuery.data && (listQuery.data.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {listQuery.data.totalPages ?? 1}
          </span>
          <Button
            variant="outline"
            size="sm"
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
