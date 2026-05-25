import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  LayoutGrid,
  MapPin,
  Minus,
  Moon,
  PawPrint,
  Phone,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
  User as UserIcon,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyProfile, useMySchedule } from '@/features/vet-me/api';
import { useGetOwner } from '@/lib/api/generated/owners/owners';
import { useGetPet } from '@/lib/api/generated/pets/pets';
import { useSearchVisits } from '@/lib/api/generated/visits/visits';
import { CircleProgress } from '@/features/vet-me/components/charts/CircleProgress';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import {
  JS_DAY_TO_WORKDAY,
  WORKDAY_LABEL,
  WORKDAY_ORDER,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';
import type {
  OwnerResponse,
  PetResponse,
  VisitResponse,
  WorkScheduleSlotResponse,
  WorkScheduleSlotResponseWorkHour,
  WorkScheduleSlotResponseWorkday,
} from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

type ViewMode = 'week' | 'today' | 'summary';

/** Tối đa SLOT_CAPACITY ca khám active per khung giờ — đồng bộ với BE
 * VisitServiceImpl.SLOT_CAPACITY (visits-service). FE chỉ render. */
const SLOT_CAPACITY = 2;

export const Route = createFileRoute('/vet/schedule')({
  component: VetSchedulePage,
});

function VetSchedulePage() {
  const [mode, setMode] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const scheduleQuery = useMySchedule();
  const profileQuery = useMyProfile();
  const vetId = profileQuery.data?.id;
  const slots = useMemo(() => scheduleQuery.data ?? [], [scheduleQuery.data]);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    workHour: WorkScheduleSlotResponseWorkHour;
  } | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayWorkday = JS_DAY_TO_WORKDAY[today.getDay()];
  const weekStart = useMemo(() => startOfWeek(today, weekOffset), [today, weekOffset]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const occupied = useMemo(
    () => new Set(slots.map((s) => `${s.workday}|${s.workHour}`)),
    [slots],
  );

  // Tải visits cả tuần đang xem để tô màu slot đầy/đang nhận.
  const weekFromIso = useMemo(() => weekStart.toISOString(), [weekStart]);
  const weekToIso = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end.toISOString();
  }, [weekStart]);
  const weekVisitsQuery = useSearchVisits(
    {
      vetId,
      from: weekFromIso,
      to: weekToIso,
      pageable: { page: 0, size: 200, sort: ['scheduledAt,asc'] },
    },
    { query: { enabled: vetId != null } },
  );
  const slotLoad = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of weekVisitsQuery.data?.content ?? []) {
      if (!v.scheduledAt || v.status === 'CANCELLED') continue;
      const d = new Date(v.scheduledAt);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}|${d.getHours()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [weekVisitsQuery.data]);
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
          slotLoad={slotLoad}
          onSlotClick={(date, workHour) => setSelectedSlot({ date, workHour })}
        />
      ) : mode === 'today' ? (
        <TodayView
          slots={slots}
          todayWorkday={todayWorkday}
          today={today}
          slotLoad={slotLoad}
          onSlotClick={(date, workHour) => setSelectedSlot({ date, workHour })}
        />
      ) : (
        <SummaryView perDay={perDay} totalSlots={totalSlots} coveragePct={coveragePct} />
      )}

      <SlotDetailDialog
        open={selectedSlot != null}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
        vetId={vetId}
        date={selectedSlot?.date ?? null}
        workHour={selectedSlot?.workHour ?? null}
      />
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
  slotLoad,
  onSlotClick,
}: {
  weekStart: Date;
  weekDays: { workday: WorkScheduleSlotResponseWorkday; date: Date }[];
  weekOffset: number;
  setWeekOffset: (fn: (v: number) => number) => void;
  todayWorkday?: WorkScheduleSlotResponseWorkday;
  today: Date;
  occupied: Set<string>;
  slotLoad: Map<string, number>;
  onSlotClick: (date: Date, workHour: WorkScheduleSlotResponseWorkHour) => void;
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

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <LegendDot className="bg-violet-500" label="Trống" />
            <LegendDot className="bg-amber-500" label="Đang nhận ca" />
            <LegendDot className="bg-rose-500" label="Đã đầy" />
            <LegendDot className="bg-slate-200" label="Không trực" />
            <LegendDot
              className="bg-emerald-500 ring-1 ring-emerald-300"
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
                        'min-w-28 px-2 py-2 text-center align-bottom',
                        isToday &&
                          'border-x-2 border-t-2 border-emerald-400 bg-emerald-100/40',
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'font-bold',
                              isToday
                                ? 'text-base text-emerald-700'
                                : 'text-sm text-slate-800',
                            )}
                          >
                            {WORKDAY_LABEL[workday]}
                          </span>
                          {isToday && (
                            <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase shadow-sm">
                              Hôm nay
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            'tabular-nums',
                            isToday
                              ? 'text-sm font-extrabold text-emerald-800'
                              : 'text-xs font-medium text-slate-400',
                          )}
                        >
                          {formatShortDate(date)}
                        </div>
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
                  slotLoad={slotLoad}
                  todayWorkday={todayWorkday}
                  today={today}
                  onSlotClick={onSlotClick}
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
  slotLoad,
  todayWorkday,
  today,
  onSlotClick,
}: {
  group: ShiftGroup;
  weekDays: { workday: WorkScheduleSlotResponseWorkday; date: Date }[];
  occupied: Set<string>;
  slotLoad: Map<string, number>;
  todayWorkday?: WorkScheduleSlotResponseWorkday;
  today: Date;
  onSlotClick: (date: Date, workHour: WorkScheduleSlotResponseWorkHour) => void;
}) {
  return (
    <>
      <tr>
        <td className="border-t border-slate-100 px-4 pt-4 pb-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            <span className={cn('rounded-md p-1', group.tone)}>
              <group.icon className="size-3" />
            </span>
            {group.label}
          </div>
        </td>
        {weekDays.map(({ workday, date }) => {
          const isToday = workday === todayWorkday && isSameDay(date, today);
          return (
            <td
              key={`hdr-${workday}`}
              className={cn(
                'border-t border-slate-100 pt-4 pb-1',
                isToday && 'border-x-2 border-emerald-400 bg-emerald-100/40',
              )}
            />
          );
        })}
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
            const load = slotLoad.get(slotLoadKey(date, hour)) ?? 0;
            return (
              <td
                key={`${workday}-${hour}`}
                className={cn(
                  'p-1.5 align-middle',
                  isToday && 'border-x-2 border-emerald-400 bg-emerald-100/40',
                )}
              >
                <HeatCell
                  on={isOn}
                  today={isToday}
                  load={load}
                  onClick={isOn ? () => onSlotClick(date, hour) : undefined}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function HeatCell({
  on,
  today,
  load,
  onClick,
}: {
  on: boolean;
  today: boolean;
  load: number;
  onClick?: () => void;
}) {
  if (on) {
    const full = load >= SLOT_CAPACITY;
    const busy = !full && load > 0;
    const tone = full
      ? 'bg-gradient-to-br from-rose-500 to-rose-600'
      : busy
        ? 'bg-gradient-to-br from-amber-500 to-amber-600'
        : 'bg-gradient-to-br from-violet-500 to-violet-600';
    return (
      <button
        type="button"
        onClick={onClick}
        title={
          full
            ? `Đã đầy ca trực (${load}/${SLOT_CAPACITY}) — click để xem chi tiết`
            : busy
              ? `Đang nhận ca (${load}/${SLOT_CAPACITY}) — click để xem chi tiết`
              : 'Trống — click để xem chi tiết'
        }
        className={cn(
          'flex h-9 w-full items-center justify-center gap-1 rounded-md text-xs font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1',
          tone,
          today && 'ring-2 ring-emerald-300',
        )}
      >
        {full ? (
          <>
            <Users className="size-3.5" />
            <span className="text-[10px] font-bold tracking-wider text-white/90 tabular-nums">
              {load}/{SLOT_CAPACITY}
            </span>
          </>
        ) : busy ? (
          <span className="text-[10px] font-bold tabular-nums">
            {load}/{SLOT_CAPACITY}
          </span>
        ) : (
          <CheckCircle2 className="size-4" />
        )}
      </button>
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
  today,
  slotLoad,
  onSlotClick,
}: {
  slots: WorkScheduleSlotResponse[];
  todayWorkday?: WorkScheduleSlotResponseWorkday;
  today: Date;
  slotLoad: Map<string, number>;
  onSlotClick: (date: Date, workHour: WorkScheduleSlotResponseWorkHour) => void;
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
              const load = slotLoad.get(slotLoadKey(today, hour)) ?? 0;
              const full = load >= SLOT_CAPACITY;
              const busy = !full && load > 0;
              return (
                <li key={hour} className="relative pl-5">
                  <span
                    className={cn(
                      'absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full ring-4 ring-white',
                      full
                        ? 'bg-rose-500'
                        : busy
                          ? 'bg-amber-500'
                          : status === 'live'
                            ? 'bg-emerald-500'
                            : status === 'upcoming'
                              ? 'bg-violet-400'
                              : 'bg-slate-300',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => onSlotClick(today, hour)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                      full
                        ? 'border-rose-200 bg-rose-50/60 hover:bg-rose-50'
                        : busy
                          ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50'
                          : status === 'live'
                            ? 'border-emerald-200 bg-emerald-50/60 hover:bg-violet-50/60'
                            : status === 'upcoming'
                              ? 'border-violet-100 bg-white hover:bg-violet-50/60'
                              : 'border-slate-100 bg-slate-50/60',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Clock3
                        className={cn(
                          'size-4 shrink-0',
                          full
                            ? 'text-rose-600'
                            : busy
                              ? 'text-amber-600'
                              : status === 'live'
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
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums',
                          full
                            ? 'border-rose-200 bg-rose-100 text-rose-700'
                            : busy
                              ? 'border-amber-200 bg-amber-100 text-amber-700'
                              : 'border-violet-200 bg-violet-50 text-violet-700',
                        )}
                      >
                        <Users className="size-2.5" />
                        {load}/{SLOT_CAPACITY}
                      </span>
                    </div>
                    <StatusBadge status={status} />
                  </button>
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

/** Key cho slotLoad map: "YYYY-MM-DD|<startHour>" (local time của browser). */
function slotLoadKey(date: Date, hour: WorkScheduleSlotResponseWorkHour): string {
  const m = /^HOUR_(\d+)_/.exec(hour);
  const startHour = m ? Number(m[1]) : 0;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}|${startHour}`;
}

function parseWorkHourRange(hour: WorkScheduleSlotResponseWorkHour): {
  startHour: number;
  endHour: number;
} {
  const m = /^HOUR_(\d+)_(\d+)$/.exec(hour);
  return { startHour: m ? Number(m[1]) : 0, endHour: m ? Number(m[2]) : 0 };
}

function toApiInstant(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

interface SlotDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vetId?: number;
  date: Date | null;
  workHour: WorkScheduleSlotResponseWorkHour | null;
}

function SlotDetailDialog({
  open,
  onOpenChange,
  vetId,
  date,
  workHour,
}: SlotDetailDialogProps) {
  const range = workHour ? parseWorkHourRange(workHour) : { startHour: 0, endHour: 0 };
  const fromIso = date && workHour ? toApiInstant(date, range.startHour) : undefined;
  const toIso = date && workHour ? toApiInstant(date, range.endHour) : undefined;

  const visitsQuery = useSearchVisits(
    {
      vetId,
      from: fromIso,
      to: toIso,
      pageable: { page: 0, size: 20, sort: ['scheduledAt,asc'] },
    },
    {
      query: { enabled: open && vetId != null && !!fromIso && !!toIso },
    },
  );

  const visits = visitsQuery.data?.content ?? [];
  const activeCount = visits.filter((v) => v.status !== 'CANCELLED').length;

  const dateLabel = date
    ? date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <CalendarCheck className="size-5 text-violet-600" />
                Ca trực {workHour ? formatHour(workHour) : ''}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                {dateLabel || 'Chi tiết khung giờ trực'}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 tabular-nums">
                {activeCount} ca khám
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {activeCount === 0 ? 'Trống' : 'Có lịch hẹn'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {visitsQuery.isLoading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : visitsQuery.isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Không tải được danh sách ca khám. Vui lòng thử lại.
            </div>
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-8 text-center">
              <Coffee className="size-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Chưa có ca khám nào</p>
              <p className="max-w-sm text-xs text-slate-500">
                Khung giờ này chưa có khách hàng đặt lịch. Bạn vẫn đang trực và sẵn sàng
                tiếp nhận booking mới.
              </p>
            </div>
          ) : (
            visits.map((visit) => <VisitRow key={visit.id} visit={visit} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisitRow({ visit }: { visit: VisitResponse }) {
  const [expanded, setExpanded] = useState(false);
  const petQuery = useGetPet(visit.petId as number, {
    query: { enabled: visit.petId != null },
  });
  const pet = petQuery.data;
  const ownerQuery = useGetOwner(pet?.ownerId as number, {
    query: { enabled: pet?.ownerId != null },
  });
  const owner = ownerQuery.data;

  const scheduled = visit.scheduledAt ? new Date(visit.scheduledAt) : null;
  const timeLabel = scheduled
    ? `${pad2(scheduled.getHours())}:${pad2(scheduled.getMinutes())}`
    : '—';

  const ownerName = owner
    ? `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() ||
      `Owner #${pet?.ownerId}`
    : ownerQuery.isLoading
      ? 'Đang tải…'
      : `Owner #${pet?.ownerId ?? '—'}`;
  const cancelled = visit.status === 'CANCELLED';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-colors',
        cancelled
          ? 'border-slate-200 bg-slate-50/60 opacity-70'
          : 'border-slate-200 bg-white hover:border-violet-200',
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
            <PawPrint className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-950">
                {petQuery.isLoading ? 'Đang tải…' : (pet?.name ?? `Pet #${visit.petId}`)}
              </p>
              <VisitStatusChip status={visit.status} />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
              <UserIcon className="size-3" /> {ownerName}
              <span className="text-slate-300">·</span>
              <Clock3 className="size-3" /> {timeLabel}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PetMini pet={pet} loading={petQuery.isLoading} />
            <OwnerMini
              owner={owner}
              loading={ownerQuery.isLoading}
              ownerId={pet?.ownerId}
            />
          </div>
          {visit.reason && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Lý do khám
              </p>
              <p className="font-medium">{visit.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PetMini({ pet, loading }: { pet?: PetResponse; loading: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
        <PawPrint className="size-3" /> Thú cưng
      </p>
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : !pet ? (
        <p className="text-xs text-slate-400">Không có thông tin.</p>
      ) : (
        <dl className="space-y-1 text-xs">
          <MiniRow label="Tên" value={pet.name ?? '—'} />
          <MiniRow label="Loại" value={pet.type ?? '—'} />
          <MiniRow label="Ngày sinh" value={pet.birthDate ?? '—'} />
          <MiniRow
            label="Cân nặng"
            value={pet.weight != null ? `${pet.weight} kg` : '—'}
          />
        </dl>
      )}
    </div>
  );
}

function OwnerMini({
  owner,
  loading,
  ownerId,
}: {
  owner?: OwnerResponse;
  loading: boolean;
  ownerId?: number;
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-violet-700 uppercase">
          <UserIcon className="size-3" /> Khách hàng
        </p>
        {ownerId != null && (
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-700">
            #{ownerId}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : !owner ? (
        <p className="text-xs text-slate-400">Không có thông tin.</p>
      ) : (
        <dl className="space-y-1 text-xs">
          <MiniRow
            label="Họ tên"
            value={`${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || '—'}
          />
          <MiniRow label="SĐT" value={owner.telephone ?? '—'} icon={Phone} />
          <MiniRow
            label="Địa chỉ"
            value={[owner.address, owner.city].filter(Boolean).join(', ') || '—'}
            icon={MapPin}
          />
          <MiniRow
            label="Tổng pet"
            value={`${owner.pets?.length ?? 0} bé`}
            icon={PawPrint}
          />
        </dl>
      )}
    </div>
  );
}

function MiniRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-dashed border-slate-200/60 pb-1 last:border-none last:pb-0">
      <dt className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
        {Icon && <Icon className="size-3" />}
        {label}
      </dt>
      <dd className="max-w-[70%] truncate text-right text-xs font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function VisitStatusChip({ status }: { status?: VisitResponse['status'] }) {
  if (!status) return null;
  const map = {
    SCHEDULED: { label: 'Đã đặt', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
    IN_PROGRESS: {
      label: 'Đang khám',
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    COMPLETED: { label: 'Hoàn tất', cls: 'border-slate-200 bg-slate-50 text-slate-600' },
    CANCELLED: { label: 'Đã huỷ', cls: 'border-rose-200 bg-rose-50 text-rose-600' },
  } as const;
  const cfg = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold',
        cfg.cls,
      )}
    >
      {cfg.label}
    </span>
  );
}
