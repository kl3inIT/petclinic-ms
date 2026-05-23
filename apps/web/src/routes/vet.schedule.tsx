import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  RotateCcw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMySchedule } from '@/features/vet-me/api';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import {
  JS_DAY_TO_WORKDAY,
  WORKDAY_LABEL,
  WORKDAY_ORDER,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';
import type { WorkScheduleSlotResponseWorkHour } from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/vet/schedule')({
  component: VetSchedulePage,
});

function VetSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const scheduleQuery = useMySchedule();
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayWorkday = JS_DAY_TO_WORKDAY[today.getDay()];
  const weekStart = useMemo(() => startOfWeek(today, weekOffset), [today, weekOffset]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const totalSlots = scheduleQuery.data?.length ?? 0;

  const occupied = new Set(
    (scheduleQuery.data ?? []).map((slot) => `${slot.workday}|${slot.workHour}`),
  );

  return (
    <div className="relative space-y-5 overflow-hidden rounded-xl bg-[#fbfaff] p-3 sm:p-5 lg:p-6">
      <VetPageHeader
        icon={CalendarDays}
        title="Lịch trực tuần"
        subtitle="Khung giờ làm việc cố định trong tuần. Liên hệ admin nếu cần điều chỉnh."
        action={
          !scheduleQuery.isLoading && (
            <Badge
              variant="secondary"
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <Clock3 className="size-4" />
              {totalSlots} khung giờ / tuần
            </Badge>
          )
        }
      />

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => setWeekOffset((value) => value - 1)}
              aria-label="Tuần trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2 border-violet-200 px-4 text-sm font-semibold text-slate-800 hover:bg-violet-50"
            >
              <CalendarDays className="size-4 text-violet-600" />
              {formatWeekRange(weekStart)}
              <ChevronDown className="size-4 text-slate-500" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => setWeekOffset((value) => value + 1)}
              aria-label="Tuần sau"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 w-fit gap-2 border-violet-200 px-4 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            onClick={() => setWeekOffset(0)}
          >
            <RotateCcw className="size-4" />
            Mặc định
          </Button>
        </CardContent>
      </Card>

      {scheduleQuery.isLoading ? (
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-[34rem] w-full" />
          </CardContent>
        </Card>
      ) : totalSlots === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có lịch trực"
          description="Admin chưa thiết lập lịch trực cho bạn. Hãy liên hệ quản trị viên."
        />
      ) : (
        <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-sm">
          <CardContent className="overflow-auto p-0">
            <table className="min-w-[980px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-36 border-b border-slate-200 bg-white px-5 py-4 text-left text-xs font-bold text-slate-700">
                    Khung giờ
                  </th>
                  {weekDays.map(({ workday, date }) => {
                    const isToday = workday === todayWorkday && isSameDay(date, today);
                    return (
                      <th
                        key={workday}
                        className={cn(
                          'min-w-32 border-b border-slate-200 px-4 py-4 text-center',
                          isToday ? 'bg-violet-50 text-violet-700' : 'bg-white',
                        )}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800">
                            {WORKDAY_LABEL[workday]}
                          </div>
                          <div
                            className={cn(
                              'text-xs font-medium text-slate-400',
                              isToday && 'text-violet-500',
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
                {WORKHOUR_ORDER.map((workHour) => (
                  <tr key={workHour} className="group">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-5 py-3 font-semibold text-slate-700 group-hover:bg-violet-50/40">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="size-4 text-slate-400" />
                        {formatWorkHour(workHour)}
                      </span>
                    </td>
                    {weekDays.map(({ workday, date }) => {
                      const isOn = occupied.has(`${workday}|${workHour}`);
                      const isToday = workday === todayWorkday && isSameDay(date, today);

                      return (
                        <td
                          key={`${workday}-${workHour}`}
                          className={cn(
                            'border-b border-slate-100 px-4 py-3 text-center group-hover:bg-violet-50/40',
                            isToday && 'bg-violet-50/70 group-hover:bg-violet-50',
                          )}
                        >
                          {isOn ? <OnDutyPill /> : <OffDutyPill />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {totalSlots > 0 && (
        <div className="flex flex-wrap items-center gap-6 px-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </span>
            Đang trực
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Minus className="size-4" />
            </span>
            Cột hôm nay
          </span>
        </div>
      )}
    </div>
  );
}

function OnDutyPill() {
  return (
    <span className="inline-flex min-w-24 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
      <CheckCircle2 className="size-3.5" />
      Đang trực
    </span>
  );
}

function OffDutyPill() {
  return (
    <span className="inline-flex min-w-24 items-center justify-center gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
      <Minus className="size-3.5" />
      Cột hôm nay
    </span>
  );
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
  return `${weekStart.getDate()} - ${end.getDate()} Tháng ${
    end.getMonth() + 1
  }, ${end.getFullYear()}`;
}

function formatShortDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
}

function formatWorkHour(workHour: WorkScheduleSlotResponseWorkHour): string {
  const match = /^HOUR_(\d+)_(\d+)$/.exec(workHour);
  if (!match) return workHour;
  return `${pad2(Number(match[1]))}:00 - ${pad2(Number(match[2]))}:00`;
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
