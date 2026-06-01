import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import {
  getGetVetRatingsSummaryQueryKey,
  getListVetRatingsQueryKey,
  useDeleteVetRating,
  useGetVetRatingsSummary,
  useListVetRatings,
} from '@/lib/api/generated/vet-ratings/vet-ratings';
import type { RatingResponse } from '@/lib/api/generated/model';

interface Props {
  vetId: number;
}

export function VetRatingsTab({ vetId }: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<RatingResponse | null>(null);

  const summaryQuery = useGetVetRatingsSummary(vetId);
  const listQuery = useListVetRatings(vetId, {
    pageable: { page, size: 10, sort: ['rateDate,desc'] },
  });

  const deleteMutation = useDeleteVetRating({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa đánh giá');
        void qc.invalidateQueries({ queryKey: getListVetRatingsQueryKey(vetId) });
        void qc.invalidateQueries({ queryKey: getGetVetRatingsSummaryQueryKey(vetId) });
        setDeleting(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tổng quan</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryQuery.isLoading || summaryQuery.isError ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Số lượt đánh giá</p>
                <p className="text-2xl font-semibold">{summaryQuery.data?.count ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Điểm trung bình</p>
                <p className="text-2xl font-semibold">
                  {summaryQuery.data?.average?.toFixed(2) ?? '—'}
                  <Star className="ml-1 inline size-4 fill-yellow-400 text-yellow-400" />
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Phân bố</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}★: {summaryQuery.data?.distribution?.[s.toString()] ?? 0}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {listQuery.isLoading || listQuery.isError ? (
        <Skeleton className="h-32 w-full" />
      ) : (listQuery.data?.content ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chưa có đánh giá nào
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {listQuery.data?.content?.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < (r.score ?? 0)
                              ? 'size-4 fill-yellow-400 text-yellow-400'
                              : 'size-4 text-muted-foreground/30'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{r.customerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.rateDate ? new Date(r.rateDate).toLocaleString('vi-VN') : ''}
                    </span>
                  </div>
                  {r.description && <p className="text-sm">{r.description}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Xóa đánh giá"
                  title="Xóa đánh giá"
                  onClick={() => setDeleting(r)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(listQuery.data?.totalPages ?? 0) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="self-center text-sm">
            Trang {page + 1} / {listQuery.data?.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= (listQuery.data?.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa đánh giá</AlertDialogTitle>
            <AlertDialogDescription>
              Đánh giá của <strong>{deleting?.customerName}</strong> ({deleting?.score}★)
              sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting?.id == null) return;
                deleteMutation.mutate({ vetId, ratingId: deleting.id });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
