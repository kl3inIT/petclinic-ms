import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Minus,
  Moon,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMySchedule } from '@/features/vet-me/api';
import { CircleProgress } from '@/features/vet-me/components/charts/CircleProgress';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import {
  JS_DAY_TO_WORKDAY,
  WORKDAY_LABEL,
  WORKDAY_ORDER,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';
import type {
  WorkScheduleSlotResponse,
  WorkScheduleSlotResponseWorkHour,
  WorkScheduleSlotResponseWorkday,
} from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

type ViewMode = 'week' | 'today' | 'summary';

export const Route = createFileRoute('/vet/schedule')({
  component: VetSchedulePage,
});

function VetSchedulePage() {
  const [mode, setMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const scheduleQuery = useMySchedule();
  const slots = useMemo(() => scheduleQuery.data ?? [], [scheduleQuery.data]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayWorkday = JS_DAY_TO_WORKDAY[today.getDay()];
  const weekStart = useMemo(() => startOfWeek(today, weekOffset), [today, weekOffset]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const occupied = useMemo(
    () => new Set(slots.map((s) => `${s.workday}|${s.workHour}`)),
    [slots],
  );
  const totalSlots = slots.length;
  const totalHours = totalSlots;
  const totalCapacity = WORKDAY_ORDER.length * WORKHOUR_ORDER.length;
  const coveragePct = totalCapacity === 0 ? 0 : (totalSlots / totalCapacity) * 100;

  const perDay = useMemo(() => buildPerDayStats(slots), [slots]);
  const daysOff = perDay.filter((d) => d.count === 0).map((d) => d.workday);

  return (
    <div className="space-y-6">
      <Hero
        loading={scheduleQuery.isLoading}
        totalSlots={totalSlots}
        totalHours={totalHours}
        coveragePct={coveragePct}
        daysOff={daysOff}
      />

      <Tabs mode={mode} onChange={setMode} />

      {scheduleQuery.isLoading ? (
        <Card className="border-slate-200/70 bg-white shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : totalSlots === 0 ? (
        <Card className="border-slate-200/70 bg-white shadow-sm">
          <CardContent className="p-10">
            <EmptyState
              icon={CalendarDays}
              title="Chưa có lịch trực"
              description="Admin chưa thiết lập lịch trực cho bạn. Hãy liên hệ quản trị viên."
            />
          </CardContent>
        </Card>
      ) : mode === 'week' ? (
        <WeekHeatmap
          weekStart={weekStart}
          weekDays={weekDays}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          todayWorkday={todayWorkday}
          today={today}
          occupied={occupied}
        />
      ) : mode === 'today' ? (
        <TodayView slots={slots} todayWorkday={todayWorkday} />
      ) : (
        <SummaryView perDay={perDay} totalSlots={totalSlots} coveragePct={coveragePct} />
      )}
    </div>
  );
}

function Hero({
  loading,
  totalSlots,
  totalHours,
  coveragePct,
  daysOff,
}: {
  loading: boolean;
  totalSlots: number;
  totalHours: number;
  coveragePct: number;
  daysOff: WorkScheduleSlotResponseWorkday[];
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/40 to-white shadow-sm">
      <div className="absolute top-4 right-6 hidden text-violet-100 sm:block">
        <CalendarCheck className="size-32" />
      </div>
      <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-center">
        <div className="flex items-center gap-5">
          <CircleProgress
            value={coveragePct}
            max={100}
            size={96}
            strokeWidth={9}
            progressClassName="stroke-violet-600"
            trackClassName="stroke-violet-100"
            label={
              <div>
                <div className="text-2xl font-bold text-slate-950 tabular-nums">
                  {Math.round(coveragePct)}%
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  Coverage
                </div>
              </div>
            }
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-violet-600 uppercase">
              <CalendarDays className="size-3.5" />
              Lịch trực của bạn
            </div>
            <h1 className="mt-1 text-2xl leading-tight font-bold text-slate-950 sm:text-3xl">
              {loading ? 'Đang tải...' : `${totalSlots} khung giờ/tuần`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tổng cộng {totalHours} giờ làm việc cố định. Liên hệ admin để điều chỉnh.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap lg:ml-auto">
          <HeroStat
            icon={Activity}
            label="Tổng giờ"
            value={`${totalHours}h`}
            tone="violet"
          />
          <HeroStat
            icon={CheckCircle2}
            label="Coverage"
            value={`${Math.round(coveragePct)}%`}
            tone="emerald"
          />
          <HeroStat
            icon={Moon}
            label="Ngày nghỉ"
            value={String(daysOff.length)}
            tone="slate"
          />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: 'violet' | 'emerald' | 'slate';
}) {
  const TONE = {
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-md p-1.5', TONE[tone])}>
          <Icon className="size-3.5" />
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-xl font-bold text-slate-950 tabular-nums">{value}</p>
    </div>
  );
}

function Tabs({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const tabs: { value: ViewMode; label: string; icon: LucideIcon }[] = [
    { value: 'week', label: 'Lịch tuần', icon: LayoutGrid },
    { value: 'today', label: 'Hôm nay', icon: CalendarCheck },
    { value: 'summary', label: 'Tóm tắt', icon: Activity },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {tabs.map((t) => {
        const active = mode === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
              active
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function WeekHeatmap({
  weekStart,
  weekDays,
  weekOffset,
  setWeekOffset,
  todayWorkday,
  today,
  occupied,
}: {
  weekStart: Date;
  weekDays: { workday: WorkScheduleSlotResponseWorkday; date: Date }[];
  weekOffset: number;
  setWeekOffset: (fn: (v: number) => number) => void;
  todayWorkday?: WorkScheduleSlotResponseWorkday;
  today: Date;
  occupied: Set<string>;
}) {
  return (
    <Card className="border-slate-200/70 bg-white shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 border-slate-200"
              onClick={() => setWeekOffset((v) => v - 1)}
              aria-label="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-800">
              <CalendarDays className="size-4 text-violet-600" />
              {formatWeekRange(weekStart)}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 border-slate-200"
              onClick={() => setWeekOffset((v) => v + 1)}
              aria-label="Tuần sau"
            >
              <ChevronRight className="size-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-violet-700"
                onClick={() => setWeekOffset(() => 0)}
              >
                <RotateCcw className="size-3.5" />
                Tuần này
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <LegendDot className="bg-emerald-500" label="Đang trực" />
            <LegendDot className="bg-violet-100 ring-1 ring-violet-200" label="Trống" />
            <LegendDot
              className="bg-emerald-200 ring-1 ring-emerald-300"
              label="Hôm nay"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[920px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32 px-4 py-2 text-left text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Khung giờ
                </th>
                {weekDays.map(({ workday, date }) => {
                  const isToday = workday === todayWorkday && isSameDay(date, today);
                  return (
                    <th
                      key={workday}
                      className={cn(
                        'min-w-28 px-2 py-2 text-center',
                        isToday && 'bg-emerald-50/40',
                      )}
                    >
                      <div
                        className={cn(
                          'text-sm font-bold',
                          isToday ? 'text-emerald-700' : 'text-slate-800',
                        )}
                      >
                        {WORKDAY_LABEL[workday]}
                      </div>
                      <div
                        className={cn(
                          'text-xs font-medium',
                          isToday ? 'text-emerald-600' : 'text-slate-400',
                        )}
                      >
                        {formatShortDate(date)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SHIFT_GROUPS.map((group) => (
                <ShiftGroupRows
                  key={group.label}
                  group={group}
                  weekDays={weekDays}
                  occupied={occupied}
                  todayWorkday={todayWorkday}
                  today={today}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShiftGroup {
  label: string;
  icon: LucideIcon;
  tone: string;
  hours: WorkScheduleSlotResponseWorkHour[];
}

const SHIFT_GROUPS: ShiftGroup[] = [
  {
    label: 'Sáng',
    icon: Sunrise,
    tone: 'text-amber-600 bg-amber-50',
    hours: ['HOUR_8_9', 'HOUR_9_10', 'HOUR_10_11', 'HOUR_11_12'],
  },
  {
    label: 'Trưa',
    icon: Sun,
    tone: 'text-orange-600 bg-orange-50',
    hours: ['HOUR_12_13', 'HOUR_13_14'],
  },
  {
    label: 'Chiều',
    icon: Sunset,
    tone: 'text-rose-600 bg-rose-50',
    hours: ['HOUR_14_15', 'HOUR_15_16', 'HOUR_16_17', 'HOUR_17_18'],
  },
  {
    label: 'Tối',
    icon: Moon,
    tone: 'text-indigo-600 bg-indigo-50',
    hours: ['HOUR_18_19', 'HOUR_19_20'],
  },
];

function ShiftGroupRows({
  group,
  weekDays,
  occupied,
  todayWorkday,
  today,
}: {
  group: ShiftGroup;
  weekDays: { workday: WorkScheduleSlotResponseWorkday; date: Date }[];
  occupied: Set<string>;
  todayWorkday?: WorkScheduleSlotResponseWorkday;
  today: Date;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={weekDays.length + 1}
          className="border-t border-slate-100 px-4 pt-4 pb-1"
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            <span className={cn('rounded-md p-1', group.tone)}>
              <group.icon className="size-3" />
            </span>
            {group.label}
          </div>
        </td>
      </tr>
      {group.hours.map((hour) => (
        <tr key={hour} className="group">
          <td className="px-4 py-1.5 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-3 text-slate-400" />
              {formatHour(hour)}
            </span>
          </td>
          {weekDays.map(({ workday, date }) => {
            const isOn = occupied.has(`${workday}|${hour}`);
            const isToday = workday === todayWorkday && isSameDay(date, today);
            return (
              <td
                key={`${workday}-${hour}`}
                className={cn('p-1.5 align-middle', isToday && 'bg-emerald-50/40')}
              >
                <HeatCell on={isOn} today={isToday} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function HeatCell({ on, today }: { on: boolean; today: boolean }) {
  if (on) {
    return (
      <div
        className={cn(
          'flex h-9 items-center justify-center rounded-md text-xs font-bold text-white shadow-sm',
          today
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-2 ring-emerald-300'
            : 'bg-gradient-to-br from-violet-500 to-violet-600',
        )}
      >
        <CheckCircle2 className="size-4" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'flex h-9 items-center justify-center rounded-md',
        today ? 'bg-emerald-100/40' : 'bg-slate-50',
      )}
    >
      <Minus className="size-3 text-slate-300" />
    </div>
  );
}

function TodayView({
  slots,
  todayWorkday,
}: {
  slots: WorkScheduleSlotResponse[];
  todayWorkday?: WorkScheduleSlotResponseWorkday;
}) {
  if (!todayWorkday) return null;
  const todaySlots = slots.filter((s) => s.workday === todayWorkday);
  const currentHour = new Date().getHours();
  const occupied = new Set(todaySlots.map((s) => s.workHour));

  return (
    <Card className="border-slate-200/70 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-950">
              Lịch {WORKDAY_LABEL[todayWorkday]}
            </h3>
            <p className="text-xs text-slate-500">
              {todaySlots.length} khung giờ làm việc hôm nay
            </p>
          </div>
          <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
            {todaySlots.length}/{WORKHOUR_ORDER.length} khung
          </Badge>
        </div>
        {todaySlots.length === 0 ? (
          <EmptyState
            icon={Moon}
            title="Hôm nay bạn được nghỉ"
            description="Không có khung giờ nào trong lịch trực hôm nay."
          />
        ) : (
          <ol className="relative space-y-1.5 pl-3">
            <span className="absolute top-1 bottom-1 left-1 w-px bg-slate-200" />
            {WORKHOUR_ORDER.map((hour) => {
              const isOn = occupied.has(hour);
              if (!isOn) return null;
              const status = slotStatus(hour, currentHour);
              return (
                <li key={hour} className="relative pl-5">
                  <span
                    className={cn(
                      'absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full ring-4 ring-white',
                      status === 'live' && 'bg-emerald-500',
                      status === 'upcoming' && 'bg-violet-400',
                      status === 'done' && 'bg-slate-300',
                    )}
                  />
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors',
                      status === 'live' && 'border-emerald-200 bg-emerald-50/60',
                      status === 'upcoming' && 'border-violet-100 bg-white',
                      status === 'done' && 'border-slate-100 bg-slate-50/60',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Clock3
                        className={cn(
                          'size-4 shrink-0',
                          status === 'live'
                            ? 'text-emerald-600'
                            : status === 'done'
                              ? 'text-slate-400'
                              : 'text-violet-500',
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          status === 'done'
                            ? 'text-slate-500 line-through'
                            : 'text-slate-900',
                        )}
                      >
                        {formatHour(hour)}
                      </span>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryView({
  perDay,
  totalSlots,
  coveragePct,
}: {
  perDay: PerDayStat[];
  totalSlots: number;
  coveragePct: number;
}) {
  const maxPerDay = Math.max(...perDay.map((d) => d.count), WORKHOUR_ORDER.length);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card className="border-slate-200/70 bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <h3 className="text-base font-bold text-slate-950">Phân bố theo ngày</h3>
            <p className="text-xs text-slate-500">
              Số khung giờ trực mỗi ngày trong tuần (tối đa {WORKHOUR_ORDER.length})
            </p>
          </div>
          <div className="space-y-3">
            {perDay.map((d) => {
              const pct = (d.count / maxPerDay) * 100;
              const isOff = d.count === 0;
              return (
                <div key={d.workday} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-semibold text-slate-700">
                    {WORKDAY_LABEL[d.workday]}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-md transition-all',
                        isOff
                          ? 'bg-slate-200'
                          : 'bg-gradient-to-r from-violet-400 to-violet-600',
                      )}
                      style={{ width: `${Math.max(pct, isOff ? 0 : 4)}%` }}
                    />
                    <span className="relative z-10 flex h-full items-center px-3 text-xs font-semibold text-white mix-blend-difference">
                      {isOff ? 'Nghỉ' : `${d.count} khung • ${d.count}h`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70 bg-white shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-base font-bold text-slate-950">Tóm tắt nhanh</h3>
          <p className="text-xs text-slate-500">Khoảng thời gian: tuần làm việc</p>

          <div className="mt-4 flex items-center justify-center">
            <CircleProgress
              value={coveragePct}
              max={100}
              size={140}
              strokeWidth={11}
              progressClassName="stroke-violet-600"
              trackClassName="stroke-violet-100"
              label={
                <div>
                  <div className="text-3xl font-bold text-slate-950 tabular-nums">
                    {Math.round(coveragePct)}%
                  </div>
                  <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    Coverage
                  </div>
                </div>
              }
            />
          </div>

          <dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            <SummaryRow label="Tổng khung giờ" value={`${totalSlots}`} />
            <SummaryRow label="Tổng giờ làm" value={`${totalSlots}h`} />
            <SummaryRow
              label="Ngày nghỉ"
              value={`${perDay.filter((d) => d.count === 0).length} ngày`}
            />
            <SummaryRow
              label="Ngày kín lịch"
              value={`${perDay.filter((d) => d.count === WORKHOUR_ORDER.length).length} ngày`}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: SlotStatus }) {
  if (status === 'live') {
    return (
      <Badge className="rounded-full border border-emerald-200 bg-emerald-100 text-emerald-700">
        Đang trực
      </Badge>
    );
  }
  if (status === 'done') {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-slate-200 bg-white text-slate-500"
      >
        Đã qua
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-violet-200 bg-violet-50 text-violet-700"
    >
      Sắp tới
    </Badge>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-sm">
      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      <span className="font-bold text-slate-950 tabular-nums">{value}</span>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-3 rounded-full', className)} />
      {label}
    </span>
  );
}

interface PerDayStat {
  workday: WorkScheduleSlotResponseWorkday;
  count: number;
}

function buildPerDayStats(slots: WorkScheduleSlotResponse[]): PerDayStat[] {
  const counts = new Map<WorkScheduleSlotResponseWorkday, number>();
  WORKDAY_ORDER.forEach((d) => counts.set(d, 0));
  slots.forEach((s) => {
    counts.set(s.workday, (counts.get(s.workday) ?? 0) + 1);
  });
  return WORKDAY_ORDER.map((workday) => ({ workday, count: counts.get(workday) ?? 0 }));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date, weekOffset: number): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + mondayOffset + weekOffset * 7);
  return result;
}

function buildWeekDays(weekStart: Date) {
  return WORKDAY_ORDER.map((workday, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { workday, date };
  });
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  return `${weekStart.getDate()}/${pad2(weekStart.getMonth() + 1)} – ${end.getDate()}/${pad2(end.getMonth() + 1)}, ${end.getFullYear()}`;
}

function formatShortDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}

function formatHour(hour: WorkScheduleSlotResponseWorkHour): string {
  const match = /^HOUR_(\d+)_(\d+)$/.exec(hour);
  if (!match) return hour;
  return `${pad2(Number(match[1]))}:00 – ${pad2(Number(match[2]))}:00`;
}

type SlotStatus = 'done' | 'live' | 'upcoming';

function slotStatus(
  hour: WorkScheduleSlotResponseWorkHour,
  currentHour: number,
): SlotStatus {
  const match = /^HOUR_(\d+)_(\d+)$/.exec(hour);
  if (!match) return 'upcoming';
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (currentHour >= end) return 'done';
  if (currentHour >= start && currentHour < end) return 'live';
  return 'upcoming';
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}
