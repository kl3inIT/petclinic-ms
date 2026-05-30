import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquareQuote,
  Reply,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyRatings, useMyRatingsSummary } from '@/features/vet-me/api';
import { AreaTrend } from '@/features/vet-me/components/charts/AreaTrend';
import { CircleProgress } from '@/features/vet-me/components/charts/CircleProgress';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { StarRating } from '@/features/vet-me/components/StarRating';
import { VetAvatar } from '@/features/vet-me/components/VetAvatar';
import { bucketRatingsByMonth } from '@/features/vet-me/stats';
import type { RatingResponse } from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';
type ScoreFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export const Route = createFileRoute('/vet/ratings')({
  component: VetRatingsPage,
});

function VetRatingsPage() {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortMode>('newest');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');

  const summaryQuery = useMyRatingsSummary();
  const listQuery = useMyRatings(page);
  const historyQuery = useMyRatings(0, 100);

  const distribution = useMemo(() => {
    const dist = summaryQuery.data?.distribution ?? {};
    const total = summaryQuery.data?.count ?? 0;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = dist[star.toString()] ?? 0;
      return {
        star,
        count,
        percent: total === 0 ? 0 : (count / total) * 100,
      };
    });
  }, [summaryQuery.data]);

  const monthBuckets = useMemo(
    () => bucketRatingsByMonth(historyQuery.data?.content ?? [], 6),
    [historyQuery.data],
  );

  const trendDelta = useMemo(() => {
    if (monthBuckets.length < 2) return null;
    const curr = monthBuckets[monthBuckets.length - 1]?.avg;
    const prev = monthBuckets[monthBuckets.length - 2]?.avg;
    if (curr == null || prev == null) return null;
    return curr - prev;
  }, [monthBuckets]);

  const filteredSorted = useMemo(() => {
    const items = [...(listQuery.data?.content ?? [])];
    const filtered =
      scoreFilter === 'all' ? items : items.filter((r) => r.score === scoreFilter);
    return sortRatings(filtered, sort);
  }, [listQuery.data, scoreFilter, sort]);

  const avg = summaryQuery.data?.average;
  const total = summaryQuery.data?.count ?? 0;
  const fiveStarPct = total === 0 ? 0 : ((distribution[0]?.count ?? 0) / total) * 100;
  const fourPlusPct =
    total === 0
      ? 0
      : (((distribution[0]?.count ?? 0) + (distribution[1]?.count ?? 0)) / total) * 100;

  return (
    <div className="space-y-6">
      <RatingsHero
        loading={summaryQuery.isLoading}
        avg={avg}
        total={total}
        distribution={distribution}
        fiveStarPct={fiveStarPct}
        fourPlusPct={fourPlusPct}
      />

      <Card className="border-slate-200/70 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <TrendingUp className="size-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  Xu hướng điểm trung bình
                </h3>
                <p className="text-xs text-slate-500">
                  6 tháng gần nhất • Điểm TB từng tháng
                </p>
              </div>
            </div>
            {trendDelta != null && (
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 font-semibold',
                  trendDelta >= 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700',
                )}
              >
                {trendDelta >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {trendDelta >= 0 ? '+' : ''}
                {trendDelta.toFixed(2)} so với tháng trước
              </Badge>
            )}
          </div>
          {historyQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="text-violet-400">
              <AreaTrend
                values={monthBuckets.map((b) => b.avg ?? 0)}
                labels={monthBuckets.map((b) => b.label)}
                height={200}
                yMin={0}
                yMax={5}
                strokeClassName="stroke-violet-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <MessageSquareQuote className="size-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-950">Danh sách đánh giá</h3>
                <p className="text-xs text-slate-500">
                  Hiển thị {filteredSorted.length} / {listQuery.data?.totalElements ?? 0}{' '}
                  đánh giá
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ScoreFilterChips value={scoreFilter} onChange={setScoreFilter} />
              <SortButton sort={sort} onChange={setSort} />
            </div>
          </div>

          {listQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : filteredSorted.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title={
                scoreFilter === 'all'
                  ? 'Chưa có đánh giá'
                  : 'Không có đánh giá khớp bộ lọc'
              }
              description={
                scoreFilter === 'all'
                  ? 'Khi khách hàng đánh giá, sẽ hiện ở đây.'
                  : 'Thử bỏ bộ lọc hoặc chọn mức điểm khác.'
              }
              action={
                scoreFilter !== 'all' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-violet-200 text-violet-700"
                    onClick={() => setScoreFilter('all')}
                  >
                    Xoá bộ lọc
                  </Button>
                )
              }
            />
          ) : (
            <ul className="space-y-3">
              {filteredSorted.map((r) => (
                <RatingItem key={r.id} rating={r} />
              ))}
            </ul>
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
        </CardContent>
      </Card>
    </div>
  );
}

function RatingsHero({
  loading,
  avg,
  total,
  distribution,
  fiveStarPct,
  fourPlusPct,
}: {
  loading: boolean;
  avg?: number;
  total: number;
  distribution: { star: number; count: number; percent: number }[];
  fiveStarPct: number;
  fourPlusPct: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm">
      <div className="absolute top-4 right-6 text-amber-100">
        <Star className="size-24" />
      </div>
      <div className="relative grid grid-cols-1 gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-5">
          {loading ? (
            <Skeleton className="size-28 rounded-full" />
          ) : (
            <CircleProgress
              value={(avg ?? 0) * 20}
              max={100}
              size={120}
              strokeWidth={9}
              progressClassName="stroke-amber-500"
              trackClassName="stroke-amber-100"
              label={
                <div>
                  <div className="text-3xl font-bold text-slate-950 tabular-nums">
                    {avg == null ? '—' : avg.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    /5.0
                  </div>
                </div>
              }
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-600 uppercase">
              <Sparkles className="size-3.5" />
              Đánh giá khách hàng
            </div>
            <h1 className="mt-1 text-2xl leading-tight font-bold text-slate-950 sm:text-3xl">
              Điểm trung bình
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <StarRating score={Math.round(avg ?? 0)} size="md" />
              <span className="text-sm text-slate-500">
                từ {total.toLocaleString('vi-VN')} đánh giá
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {distribution.map((d) => (
            <div key={d.star} className="flex items-center gap-3 text-sm">
              <span className="inline-flex w-8 shrink-0 items-center gap-1 font-semibold text-slate-700 tabular-nums">
                {d.star}
                <Star className="size-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all"
                  style={{ width: `${d.percent}%` }}
                />
              </div>
              <span className="w-12 text-right text-xs font-medium text-slate-600 tabular-nums">
                {d.count}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <KpiPill label="5 sao" value={`${Math.round(fiveStarPct)}%`} tone="amber" />
          <KpiPill label="≥ 4 sao" value={`${Math.round(fourPlusPct)}%`} tone="emerald" />
        </div>
      </div>
    </section>
  );
}

function KpiPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'amber' | 'emerald';
}) {
  const TONE = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  return (
    <div
      className={cn('rounded-lg border px-4 py-3 text-center lg:text-right', TONE[tone])}
    >
      <div className="text-[10px] font-semibold tracking-wider uppercase">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ScoreFilterChips({
  value,
  onChange,
}: {
  value: ScoreFilter;
  onChange: (v: ScoreFilter) => void;
}) {
  const opts: { value: ScoreFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 5, label: '5★' },
    { value: 4, label: '4★' },
    { value: 3, label: '3★' },
    { value: 2, label: '2★' },
    { value: 1, label: '1★' },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <span className="px-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        <Filter className="inline size-3" /> Lọc
      </span>
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              active
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const SORT_OPTIONS: {
  value: SortMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: 'newest', label: 'Mới nhất', icon: Calendar },
  { value: 'oldest', label: 'Cũ nhất', icon: Calendar },
  { value: 'highest', label: 'Điểm cao', icon: ArrowDownAZ },
  { value: 'lowest', label: 'Điểm thấp', icon: ArrowUpAZ },
];

function SortButton({
  sort,
  onChange,
}: {
  sort: SortMode;
  onChange: (v: SortMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {SORT_OPTIONS.map((o) => {
        const active = sort === o.value;
        return (
          <button
            key={o.value}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              active
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
            onClick={() => onChange(o.value)}
          >
            <o.icon className="size-3" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RatingItem({ rating }: { rating: RatingResponse }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (rating.description?.length ?? 0) > 200;
  const score = rating.score ?? 0;
  const tone = scoreTone(score);

  return (
    <li
      className={cn(
        'group rounded-xl border border-slate-200/70 bg-white p-4 transition-shadow hover:shadow-sm',
        score <= 2 && 'border-rose-200/60 bg-rose-50/20',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <VetAvatar
            firstName={rating.customerName?.split(' ')[0]}
            lastName={rating.customerName?.split(' ').slice(-1)[0]}
            size="md"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-slate-900">
                {rating.customerName ?? 'Khách hàng ẩn danh'}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-2 py-0 text-[10px] font-semibold',
                  tone.badge,
                )}
              >
                {tone.label}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="size-3" />
              {rating.rateDate
                ? new Date(rating.rateDate).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <StarRating score={score} size="md" />
          <span className="text-xs font-semibold text-slate-600 tabular-nums">
            {score}.0
          </span>
        </div>
      </div>

      {rating.description && (
        <div className="mt-3 rounded-lg border-l-2 border-violet-200 bg-slate-50/40 px-4 py-3">
          <p
            className={cn(
              'text-sm leading-6 whitespace-pre-line text-slate-700',
              !expanded && isLong && 'line-clamp-3',
            )}
          >
            "{rating.description}"
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-violet-700 hover:underline"
            >
              {expanded ? 'Thu gọn' : 'Xem đầy đủ'}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-slate-500 hover:text-violet-700"
          disabled
          title="Tính năng đang phát triển"
        >
          <Reply className="size-3" />
          Trả lời (sắp ra mắt)
        </Button>
      </div>
    </li>
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
    <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-4">
      <Button
        variant="outline"
        size="sm"
        className="border-slate-200"
        disabled={page === 0}
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" />
        Trước
      </Button>
      <span className="text-sm text-slate-500">
        Trang <span className="font-semibold text-slate-900">{page + 1}</span> /{' '}
        {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="border-slate-200"
        disabled={page + 1 >= totalPages}
        onClick={onNext}
      >
        Sau
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function sortRatings(items: RatingResponse[], mode: SortMode): RatingResponse[] {
  const arr = [...items];
  if (mode === 'newest') {
    arr.sort(
      (a, b) => new Date(b.rateDate ?? 0).getTime() - new Date(a.rateDate ?? 0).getTime(),
    );
  } else if (mode === 'oldest') {
    arr.sort(
      (a, b) => new Date(a.rateDate ?? 0).getTime() - new Date(b.rateDate ?? 0).getTime(),
    );
  } else if (mode === 'highest') {
    arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else if (mode === 'lowest') {
    arr.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  }
  return arr;
}

function scoreTone(score: number): { label: string; badge: string } {
  if (score >= 5)
    return {
      label: 'Tuyệt vời',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  if (score >= 4)
    return { label: 'Tốt', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (score >= 3)
    return { label: 'Khá', badge: 'border-amber-200 bg-amber-50 text-amber-700' };
  if (score >= 2)
    return {
      label: 'Trung bình',
      badge: 'border-orange-200 bg-orange-50 text-orange-700',
    };
  return { label: 'Cần cải thiện', badge: 'border-rose-200 bg-rose-50 text-rose-700' };
}
