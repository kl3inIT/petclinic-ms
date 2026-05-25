import type { RatingResponse } from '@/lib/api/generated/model';

export interface WeekBucket {
  label: string;
  count: number;
  avg: number | null;
  weekStart: Date;
}

export function bucketRatingsByWeek(
  ratings: RatingResponse[],
  weeksBack = 8,
  now: Date = new Date(),
): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const todayStart = startOfDay(now);
  const dayOfWeek = todayStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(todayStart);
  thisMonday.setDate(thisMonday.getDate() + mondayOffset);

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const inWeek = ratings.filter((r) => {
      if (!r.rateDate) return false;
      const t = new Date(r.rateDate).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });
    const count = inWeek.length;
    const avg =
      count === 0 ? null : inWeek.reduce((s, r) => s + (r.score ?? 0), 0) / count;
    buckets.push({
      label: `${pad2(weekStart.getDate())}/${pad2(weekStart.getMonth() + 1)}`,
      count,
      avg,
      weekStart,
    });
  }
  return buckets;
}

export function bucketRatingsByMonth(
  ratings: RatingResponse[],
  monthsBack = 6,
  now: Date = new Date(),
): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(thisMonth);
    start.setMonth(start.getMonth() - i);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const inMonth = ratings.filter((r) => {
      if (!r.rateDate) return false;
      const t = new Date(r.rateDate).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const count = inMonth.length;
    const avg =
      count === 0 ? null : inMonth.reduce((s, r) => s + (r.score ?? 0), 0) / count;
    buckets.push({
      label: `T${start.getMonth() + 1}`,
      count,
      avg,
      weekStart: start,
    });
  }
  return buckets;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
