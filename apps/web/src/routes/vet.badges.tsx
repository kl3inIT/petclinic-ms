import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Award, ChevronLeft, ChevronRight, Lock, Medal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBadges } from '@/features/vet-me/api';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import { BADGE_TITLE_LABEL } from '@/features/vets/labels';
import type { BadgeResponseTitle } from '@/lib/api/generated/model';

const ALL_BADGES: { title: BadgeResponseTitle; description: string }[] = [
  { title: 'ROOKIE', description: 'Hoàn thành 10 ca khám đầu tiên.' },
  { title: 'EXPERIENCED', description: 'Trên 100 ca khám với rating từ 4.0.' },
  { title: 'MASTER', description: 'Trên 500 ca khám, đánh giá xuất sắc.' },
  { title: 'SURGERY_EXPERT', description: 'Chuyên gia phẫu thuật nâng cao.' },
  { title: 'RESEARCH_AWARD', description: 'Đóng góp nghiên cứu chuyên môn.' },
  { title: 'TOP_RATED', description: 'Top bác sĩ được đánh giá cao nhất.' },
];

export const Route = createFileRoute('/vet/badges')({
  component: VetBadgesPage,
});

function VetBadgesPage() {
  const [page, setPage] = useState(0);
  const listQuery = useMyBadges(page);
  const earnedTitles = new Set(
    (listQuery.data?.content ?? []).map((b) => b.title).filter(Boolean),
  );
  const lockedBadges = ALL_BADGES.filter((b) => !earnedTitles.has(b.title));

  return (
    <div className="relative space-y-5 overflow-hidden rounded-xl bg-[#fbfaff] p-3 sm:p-5 lg:p-6">
      <VetPageHeader
        icon={Award}
        title="Huy hiệu thành tích"
        subtitle="Các huy hiệu PetClinic trao tặng theo thành tích chuyên môn."
      />

      <section className="space-y-3">
        <SectionTitle
          icon={Medal}
          label="Đã đạt được"
          count={listQuery.isLoading ? undefined : (listQuery.data?.totalElements ?? 0)}
        />

        {listQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : (listQuery.data?.content?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Award}
            title="Chưa có huy hiệu nào"
            description="Tiếp tục cống hiến để mở khóa các huy hiệu thành tích bên dưới."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(listQuery.data?.content ?? []).map((b) => (
              <Card key={b.id} className="border-amber-200 bg-white/90 shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                      <Medal className="size-5" />
                    </div>
                    <span className="text-xs text-slate-500">
                      {b.awardedDate
                        ? new Date(b.awardedDate).toLocaleDateString('vi-VN')
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-950">
                      {b.title ? (BADGE_TITLE_LABEL[b.title] ?? b.title) : '-'}
                    </div>
                    {b.description && (
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {b.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {listQuery.data && (listQuery.data.totalPages ?? 0) > 1 && (
          <Pagination
            page={page}
            totalPages={listQuery.data.totalPages ?? 1}
            onPrevious={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() =>
              setPage((p) => (p + 1 < (listQuery.data?.totalPages ?? 1) ? p + 1 : p))
            }
          />
        )}
      </section>

      {page === 0 && lockedBadges.length > 0 && !listQuery.isLoading && (
        <section className="space-y-3">
          <SectionTitle icon={Lock} label="Chưa mở khóa" count={lockedBadges.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lockedBadges.map((b) => (
              <Card
                key={b.title}
                className="border-dashed border-slate-200 bg-white/70 shadow-sm"
              >
                <CardContent className="space-y-3 p-4 opacity-70">
                  <div className="rounded-xl bg-slate-100 p-3 text-slate-400">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-700">
                      {BADGE_TITLE_LABEL[b.title] ?? b.title}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
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

function SectionTitle({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Award;
  label: string;
  count?: number;
}) {
  return (
    <h2 className="flex items-center gap-2 px-1 text-sm font-bold tracking-wide text-slate-500 uppercase">
      <Icon className="size-4 text-violet-600" />
      {label}
      {count != null && <span className="text-xs font-semibold">({count})</span>}
    </h2>
  );
}

function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        className="border-violet-200 text-violet-700 hover:bg-violet-50"
        disabled={page === 0}
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" />
        Trước
      </Button>
      <span className="text-sm text-slate-500">
        Trang {page + 1} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="border-violet-200 text-violet-700 hover:bg-violet-50"
        disabled={page + 1 >= totalPages}
        onClick={onNext}
      >
        Sau
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
