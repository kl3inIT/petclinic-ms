import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyRatings, useMyRatingsSummary } from '@/features/vet-me/api';
import { scoreStars } from '@/features/vets/labels';

export const Route = createFileRoute('/vet/ratings')({
  component: VetRatingsPage,
});

function VetRatingsPage() {
  const [page, setPage] = useState(0);
  const summaryQuery = useMyRatingsSummary();
  const listQuery = useMyRatings(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Đánh giá khách hàng</h1>
        <p className="text-sm text-muted-foreground">
          Tổng hợp đánh giá khách dành cho bạn. Nội dung hiển thị nguyên gốc — không sửa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tóm tắt</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryQuery.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Tổng số" value={summaryQuery.data?.count ?? 0} />
              <Stat
                label="Trung bình"
                value={
                  summaryQuery.data?.average == null
                    ? '—'
                    : summaryQuery.data.average.toFixed(2)
                }
              />
              {[5, 4, 3].map((s) => (
                <Stat
                  key={s}
                  label={`${s} sao`}
                  value={summaryQuery.data?.distribution?.[s.toString()] ?? 0}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {listQuery.isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          : (listQuery.data?.content ?? []).map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.customerName}</div>
                    <div className="text-sm text-amber-600">
                      {scoreStars(r.score)}
                    </div>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {r.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.rateDate).toLocaleString('vi-VN')}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {!listQuery.isLoading && listQuery.data?.content?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chưa có đánh giá nào.
          </CardContent>
        </Card>
      )}

      {listQuery.data && listQuery.data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {listQuery.data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= listQuery.data.totalPages}
            onClick={() =>
              setPage((p) => (p + 1 < listQuery.data!.totalPages ? p + 1 : p))
            }
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
