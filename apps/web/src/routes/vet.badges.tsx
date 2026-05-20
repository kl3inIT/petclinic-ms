import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Award, ChevronLeft, ChevronRight, Lock, Medal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBadges } from '@/features/vet-me/api';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { BADGE_TITLE_LABEL } from '@/features/vets/labels';
import type { BadgeResponseTitle } from '@/lib/api/generated/model';

/** Catalog tất cả badge — match enum BadgeTitle BE. Dùng để render locked state. */
const ALL_BADGES: { title: BadgeResponseTitle; description: string }[] = [
  { title: 'ROOKIE', description: 'Hoàn thành 10 ca khám đầu tiên.' },
  { title: 'EXPERIENCED', description: 'Trên 100 ca khám với rating ≥ 4.0.' },
  { title: 'MASTER', description: 'Trên 500 ca khám, đánh giá xuất sắc.' },
  { title: 'SURGERY_EXPERT', description: 'Chuyên gia phẫu thuật nâng cao.' },
  { title: 'RESEARCH_AWARD', description: 'Đóng góp nghiên cứu chuyên môn.' },
  { title: 'TOP_RATED', description: 'Top 10 bác sĩ được đánh giá cao nhất.' },
];

export const Route = createFileRoute('/vet/badges')({
  component: VetBadgesPage,
});

function VetBadgesPage() {
  const [page, setPage] = useState(0);
  const listQuery = useMyBadges(page);

  // Set các badge title đã đạt — dùng để xác định locked badge
  const earnedTitles = new Set((listQuery.data?.content ?? []).map((b) => b.title).filter(Boolean));
  const lockedBadges = ALL_BADGES.filter((b) => !earnedTitles.has(b.title));

  return (
    <div className="space-y-6">
      <VetPageHeader
        icon={Award}
        title="Huy hiệu thành tích"
        subtitle="Các huy hiệu PetClinic trao tặng theo thành tích chuyên môn."
      />

      {/* Earned */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Medal className="size-4" />
          Đã đạt được
          {!listQuery.isLoading && (
            <span className="text-xs">({listQuery.data?.totalElements ?? 0})</span>
          )}
        </h2>

        {listQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : (listQuery.data?.content?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Award}
            title="Chưa có huy hiệu nào"
            description="Tiếp tục cống hiến để mở khoá các huy hiệu thành tích bên dưới."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(listQuery.data?.content ?? []).map((b) => (
              <Card
                key={b.id}
                className="border-amber-300/50 bg-gradient-to-br from-amber-50 to-amber-100/30"
              >
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-amber-200/50 p-2 text-amber-700">
                      <Medal className="size-5" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {b.awardedDate ? new Date(b.awardedDate).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">
                      {b.title ? BADGE_TITLE_LABEL[b.title] ?? b.title : '—'}
                    </div>
                    {b.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {b.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination — chỉ cho earned section */}
        {listQuery.data && (listQuery.data.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
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
      </section>

      {/* Locked — chỉ hiển thị ở page 0 để khỏi rối UX */}
      {page === 0 && lockedBadges.length > 0 && !listQuery.isLoading && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <Lock className="size-4" />
            Chưa mở khoá
            <span className="text-xs">({lockedBadges.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lockedBadges.map((b) => (
              <Card key={b.title} className="border-dashed bg-muted/20">
                <CardContent className="space-y-2 p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                      <Lock className="size-5" />
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold">
                      {BADGE_TITLE_LABEL[b.title] ?? b.title}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
