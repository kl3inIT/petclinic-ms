import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Medal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBadges } from '@/features/vet-me/api';
import { BADGE_TITLE_LABEL } from '@/features/vets/labels';

export const Route = createFileRoute('/vet/badges')({
  component: VetBadgesPage,
});

function VetBadgesPage() {
  const [page, setPage] = useState(0);
  const listQuery = useMyBadges(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Huy hiệu thành tích</h1>
        <p className="text-sm text-muted-foreground">
          Các huy hiệu PetClinic trao tặng theo thành tích chuyên môn.
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (listQuery.data?.content?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chưa có huy hiệu nào.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(listQuery.data?.content ?? []).map((b) => (
            <Card key={b.id} className="border-amber-300/50 bg-amber-50/30">
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-amber-600" />
                  <div className="font-medium">
                    {BADGE_TITLE_LABEL[b.title] ?? b.title}
                  </div>
                </div>
                {b.description && (
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  Trao ngày {new Date(b.awardedDate).toLocaleDateString('vi-VN')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
