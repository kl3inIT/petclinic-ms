import { createFileRoute } from '@tanstack/react-router';
import { CalendarDays, Clock } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMySchedule } from '@/features/vet-me/api';
import { VetPageHeader } from '@/features/vet-me/components/VetPageHeader';
import { EmptyState } from '@/features/vet-me/components/EmptyState';
import {
  WORKDAY_LABEL,
  WORKDAY_ORDER,
  WORKHOUR_LABEL,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';

const JS_DAY_TO_WORKDAY: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export const Route = createFileRoute('/vet/schedule')({
  component: VetSchedulePage,
});

function VetSchedulePage() {
  const scheduleQuery = useMySchedule();
  const todayWorkday = JS_DAY_TO_WORKDAY[new Date().getDay()];

  const occupied = new Set(
    (scheduleQuery.data ?? []).map((s) => `${s.workday}|${s.workHour}`),
  );
  const totalSlots = scheduleQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <VetPageHeader
        icon={CalendarDays}
        title="Lịch trực tuần"
        subtitle="Khung giờ làm việc cố định trong tuần. Liên hệ admin nếu cần điều chỉnh."
        action={
          !scheduleQuery.isLoading && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="size-3.5" />
              {totalSlots} khung giờ / tuần
            </Badge>
          )
        }
      />

      {scheduleQuery.isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : totalSlots === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có lịch trực"
          description="Admin chưa thiết lập lịch trực cho bạn. Hãy liên hệ quản trị viên."
        />
      ) : (
        <Card>
          <CardContent className="overflow-auto p-0">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b bg-muted/50 px-3 py-2.5 text-left font-medium">
                    Khung giờ
                  </th>
                  {WORKDAY_ORDER.map((d) => {
                    const isToday = d === todayWorkday;
                    return (
                      <th
                        key={d}
                        className={
                          'border-b bg-muted/50 px-3 py-2.5 text-center font-medium ' +
                          (isToday ? 'bg-primary/10 text-primary' : '')
                        }
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{WORKDAY_LABEL[d]}</span>
                          {isToday && (
                            <span className="text-[10px] font-normal uppercase tracking-wide text-primary">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {WORKHOUR_ORDER.map((h, hIdx) => (
                  <tr key={h} className="hover:bg-muted/30">
                    <td className="sticky left-0 z-10 border-b bg-background px-3 py-2 font-medium">
                      {WORKHOUR_LABEL[h]}
                    </td>
                    {WORKDAY_ORDER.map((d) => {
                      const isOn = occupied.has(`${d}|${h}`);
                      const isToday = d === todayWorkday;
                      return (
                        <td
                          key={d}
                          className={
                            'border-b px-3 py-2 text-center ' +
                            (isToday ? 'bg-primary/5 ' : '') +
                            (isOn
                              ? 'font-medium text-emerald-700'
                              : 'text-muted-foreground/30')
                          }
                        >
                          {isOn ? (
                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                              ✓
                            </span>
                          ) : (
                            <span>·</span>
                          )}
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

      {/* Legend */}
      {totalSlots > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700">
              ✓
            </span>
            Đang trực
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded bg-primary/10" />
            Cột hôm nay
          </span>
        </div>
      )}
    </div>
  );
}
