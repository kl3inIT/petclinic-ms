import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Crown,
  Flame,
  GraduationCap,
  Heart,
  Lock,
  Medal,
  ScrollText,
  Sparkles,
  Stethoscope,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBadges, useMyRatingsSummary } from '@/features/vet-me/api';
import { CircleProgress } from '@/features/vet-me/components/charts/CircleProgress';
import { BADGE_TITLE_LABEL } from '@/features/vets/labels';
import type { BadgeResponse, BadgeResponseTitle } from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

interface BadgeDef {
  title: BadgeResponseTitle;
  description: string;
  requirement: string;
  icon: LucideIcon;
  tone: BadgeTone;
  /** Approx progress 0..100 ước lượng từ rating count để show locked bar. */
  estimateProgress?: (ctx: { ratingCount: number; avg: number }) => number;
}

type BadgeTone = 'rookie' | 'experienced' | 'master' | 'surgery' | 'research' | 'top';

const TONE_STYLES: Record<
  BadgeTone,
  { bg: string; text: string; border: string; iconBg: string; gradient: string }
> = {
  rookie: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    iconBg: 'bg-gradient-to-br from-sky-400 to-sky-600',
    gradient: 'from-sky-50 to-white',
  },
  experienced: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    iconBg: 'bg-gradient-to-br from-violet-400 to-violet-600',
    gradient: 'from-violet-50 to-white',
  },
  master: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    gradient: 'from-amber-50 to-white',
  },
  surgery: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    iconBg: 'bg-gradient-to-br from-rose-400 to-rose-600',
    gradient: 'from-rose-50 to-white',
  },
  research: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    gradient: 'from-indigo-50 to-white',
  },
  top: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    gradient: 'from-emerald-50 to-white',
  },
};

const ALL_BADGES: BadgeDef[] = [
  {
    title: 'ROOKIE',
    description: 'Hoàn thành 10 ca khám đầu tiên với khách hàng.',
    requirement: '10 ca khám',
    icon: GraduationCap,
    tone: 'rookie',
    estimateProgress: ({ ratingCount }) => Math.min(100, (ratingCount / 10) * 100),
  },
  {
    title: 'EXPERIENCED',
    description: 'Trên 100 ca khám với điểm trung bình từ 4.0 trở lên.',
    requirement: '100 ca + 4.0★',
    icon: Stethoscope,
    tone: 'experienced',
    estimateProgress: ({ ratingCount, avg }) => {
      const cntScore = Math.min(100, (ratingCount / 100) * 100);
      const ratingScore = avg >= 4 ? 100 : (avg / 4) * 100;
      return (cntScore + ratingScore) / 2;
    },
  },
  {
    title: 'MASTER',
    description: 'Trên 500 ca khám và đánh giá xuất sắc bền vững.',
    requirement: '500 ca + 4.5★',
    icon: Crown,
    tone: 'master',
    estimateProgress: ({ ratingCount, avg }) => {
      const cntScore = Math.min(100, (ratingCount / 500) * 100);
      const ratingScore = avg >= 4.5 ? 100 : (avg / 4.5) * 100;
      return (cntScore + ratingScore) / 2;
    },
  },
  {
    title: 'SURGERY_EXPERT',
    description: 'Chuyên gia phẫu thuật nâng cao với thành tích nổi bật.',
    requirement: 'Chuyên môn phẫu thuật',
    icon: Heart,
    tone: 'surgery',
  },
  {
    title: 'RESEARCH_AWARD',
    description: 'Đóng góp nghiên cứu chuyên môn cho cộng đồng.',
    requirement: 'Bài nghiên cứu',
    icon: ScrollText,
    tone: 'research',
  },
  {
    title: 'TOP_RATED',
    description: 'Top bác sĩ được đánh giá cao nhất trong năm.',
    requirement: 'Top 10% • ≥ 4.8★',
    icon: Flame,
    tone: 'top',
    estimateProgress: ({ avg }) => Math.min(100, (avg / 4.8) * 100),
  },
];

export const Route = createFileRoute('/vet/badges')({
  component: VetBadgesPage,
});

function VetBadgesPage() {
  const [page, setPage] = useState(0);
  const listQuery = useMyBadges(page);
  const allBadgesQuery = useMyBadges(0, 50);
  const ratingsSummaryQuery = useMyRatingsSummary();

  const earnedTitles = new Set(
    (allBadgesQuery.data?.content ?? [])
      .map((b) => b.title)
      .filter((t): t is BadgeResponseTitle => !!t),
  );
  const totalDefined = ALL_BADGES.length;
  const earnedCount = allBadgesQuery.data?.totalElements ?? 0;
  const lockedBadges = ALL_BADGES.filter((b) => !earnedTitles.has(b.title));

  const ratingCount = ratingsSummaryQuery.data?.count ?? 0;
  const avg = ratingsSummaryQuery.data?.average ?? 0;

  const latestEarned = (allBadgesQuery.data?.content ?? [])[0];

  return (
    <div className="space-y-6">
      <BadgesHero
        loading={allBadgesQuery.isLoading}
        earnedCount={earnedCount}
        totalDefined={totalDefined}
        latest={latestEarned}
      />

      <section className="space-y-3">
        <SectionTitle
          icon={Medal}
          label="Huy hiệu đã đạt"
          count={listQuery.isLoading ? undefined : earnedCount}
          tone="emerald"
        />

        {listQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : (listQuery.data?.content?.length ?? 0) === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/40 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Trophy className="mb-3 size-10 text-slate-300" />
              <p className="font-semibold text-slate-700">Chưa có huy hiệu nào</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Tiếp tục cống hiến để mở khóa các huy hiệu thành tích bên dưới.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(listQuery.data?.content ?? []).map((b) => {
              const def = b.title ? ALL_BADGES.find((d) => d.title === b.title) : null;
              return <EarnedBadgeCard key={b.id} badge={b} def={def ?? null} />;
            })}
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

      {lockedBadges.length > 0 && (
        <section className="space-y-3">
          <SectionTitle
            icon={Lock}
            label="Đang khoá"
            count={lockedBadges.length}
            tone="slate"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lockedBadges.map((def) => {
              const progress = def.estimateProgress
                ? def.estimateProgress({ ratingCount, avg })
                : 0;
              return <LockedBadgeCard key={def.title} def={def} progress={progress} />;
            })}
          </div>
        </section>
      )}

      <BadgeRoadmap
        allBadges={ALL_BADGES}
        earnedTitles={earnedTitles}
        ratingCount={ratingCount}
        avg={avg}
      />
    </div>
  );
}

function BadgesHero({
  loading,
  earnedCount,
  totalDefined,
  latest,
}: {
  loading: boolean;
  earnedCount: number;
  totalDefined: number;
  latest?: BadgeResponse;
}) {
  const pct = totalDefined === 0 ? 0 : (earnedCount / totalDefined) * 100;
  const latestDef = latest?.title
    ? ALL_BADGES.find((d) => d.title === latest.title)
    : null;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-sm">
      <div className="absolute -top-4 right-4 hidden text-amber-100 sm:block">
        <Trophy className="size-44" />
      </div>
      <div className="relative grid grid-cols-1 gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <CircleProgress
          value={pct}
          max={100}
          size={140}
          strokeWidth={11}
          progressClassName="stroke-amber-500"
          trackClassName="stroke-amber-100"
          label={
            <div>
              <div className="text-3xl font-bold text-slate-950 tabular-nums">
                {earnedCount}/{totalDefined}
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Huy hiệu
              </div>
            </div>
          }
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-600 uppercase">
            <Sparkles className="size-3.5" />
            Bộ sưu tập thành tích
          </div>
          <h1 className="mt-1 text-2xl leading-tight font-bold text-slate-950 sm:text-3xl">
            {loading
              ? 'Đang tải…'
              : earnedCount === 0
                ? 'Bắt đầu hành trình của bạn'
                : `Đã đạt ${earnedCount}/${totalDefined} huy hiệu`}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Mỗi huy hiệu ghi nhận một cột mốc nghề nghiệp. Tiếp tục cung cấp dịch vụ xuất
            sắc để mở khóa thêm.
          </p>
        </div>

        {latest && latestDef && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm',
              TONE_STYLES[latestDef.tone].border,
            )}
          >
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-xl text-white shadow-md',
                TONE_STYLES[latestDef.tone].iconBg,
              )}
            >
              <latestDef.icon className="size-6" />
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Huy hiệu mới nhất
              </div>
              <div className="text-sm font-bold text-slate-950">
                {BADGE_TITLE_LABEL[latest.title!]}
              </div>
              {latest.awardedDate && (
                <div className="text-xs text-slate-500">
                  {new Date(latest.awardedDate).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function EarnedBadgeCard({ badge, def }: { badge: BadgeResponse; def: BadgeDef | null }) {
  const tone: BadgeTone = def?.tone ?? 'experienced';
  const Icon: LucideIcon = def?.icon ?? Award;
  const styles = TONE_STYLES[tone];
  return (
    <Card
      className={cn(
        'group relative overflow-hidden border bg-gradient-to-br shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        styles.border,
        styles.gradient,
      )}
    >
      <div className="absolute top-2 right-2">
        <Badge
          className={cn(
            'rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
            styles.text,
            styles.border,
          )}
        >
          <CheckCircle2 className="size-3" />
          Đã đạt
        </Badge>
      </div>
      <CardContent className="p-5">
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:scale-110',
            styles.iconBg,
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="mt-4">
          <div className="text-base font-bold text-slate-950">
            {badge.title ? (BADGE_TITLE_LABEL[badge.title] ?? badge.title) : '—'}
          </div>
          {(badge.description || def?.description) && (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {badge.description ?? def?.description}
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="size-3" />
          {badge.awardedDate
            ? `Đạt được ngày ${new Date(badge.awardedDate).toLocaleDateString('vi-VN')}`
            : '—'}
        </div>
      </CardContent>
    </Card>
  );
}

function LockedBadgeCard({ def, progress }: { def: BadgeDef; progress: number }) {
  const styles = TONE_STYLES[def.tone];
  return (
    <Card className="group relative overflow-hidden border-dashed border-slate-200 bg-white shadow-none transition-all hover:border-slate-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 opacity-70',
            )}
          >
            <def.icon className="size-7" />
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase"
          >
            <Lock className="size-3" />
            Khoá
          </Badge>
        </div>

        <div className="mt-4">
          <div className="text-base font-bold text-slate-700">
            {BADGE_TITLE_LABEL[def.title]}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{def.description}</p>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Yêu cầu: {def.requirement}</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r transition-all',
                progress > 0 ? styles.iconBg : 'bg-slate-200',
              )}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BadgeRoadmap({
  allBadges,
  earnedTitles,
  ratingCount,
  avg,
}: {
  allBadges: BadgeDef[];
  earnedTitles: Set<BadgeResponseTitle>;
  ratingCount: number;
  avg: number;
}) {
  return (
    <Card className="border-slate-200/70 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-950">Lộ trình huy hiệu</h3>
            <p className="text-xs text-slate-500">
              Tất cả {allBadges.length} cột mốc trong hệ thống
            </p>
          </div>
        </div>

        <ol className="relative space-y-3 pl-3">
          <span className="absolute top-2 bottom-2 left-1 w-px bg-slate-200" />
          {allBadges.map((def) => {
            const earned = earnedTitles.has(def.title);
            const progress = def.estimateProgress
              ? def.estimateProgress({ ratingCount, avg })
              : earned
                ? 100
                : 0;
            const styles = TONE_STYLES[def.tone];
            return (
              <li key={def.title} className="relative pl-6">
                <span
                  className={cn(
                    'absolute top-3 left-0 size-3 -translate-x-1/2 rounded-full ring-4 ring-white',
                    earned
                      ? styles.iconBg
                      : progress > 0
                        ? 'bg-violet-300'
                        : 'bg-slate-300',
                  )}
                />
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border bg-white p-3',
                    earned ? styles.border : 'border-slate-200',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        earned
                          ? cn('text-white', styles.iconBg)
                          : 'bg-slate-100 text-slate-400',
                      )}
                    >
                      <def.icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">
                        {BADGE_TITLE_LABEL[def.title]}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {def.requirement}
                      </div>
                    </div>
                  </div>
                  {earned ? (
                    <Badge
                      className={cn(
                        'rounded-full text-[10px] font-bold',
                        styles.bg,
                        styles.text,
                        styles.border,
                      )}
                    >
                      <CheckCircle2 className="size-3" />
                      Đã đạt
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        {Math.round(progress)}%
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            progress > 0 ? styles.iconBg : 'bg-slate-200',
                          )}
                          style={{ width: `${Math.max(progress, 2)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  tone: 'emerald' | 'slate';
}) {
  const TONE = {
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-500',
  };
  return (
    <div className="flex items-center gap-2 px-1">
      <span
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-lg',
          TONE[tone],
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <h2 className="text-sm font-bold tracking-wide text-slate-700 uppercase">
        {label}
      </h2>
      {count != null && (
        <Badge
          variant="outline"
          className="rounded-full border-slate-200 bg-white px-2 py-0 text-[10px] font-bold text-slate-600"
        >
          {count}
        </Badge>
      )}
    </div>
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
