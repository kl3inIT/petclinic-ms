import { createFileRoute } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMySchedule } from '@/features/vet-me/api';
import {
  WORKDAY_LABEL,
  WORKDAY_ORDER,
  WORKHOUR_LABEL,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';

/**
 * Lịch trực dạng grid 7 (workday) × 12 (workHour). Read-only — quản trị viên
 * tạo/sửa lịch ở admin/vets/{id}/schedule. Vet ở đây chỉ xem.
 */
export const Route = createFileRoute('/vet/schedule')({
  component: VetSchedulePage,
});

function VetSchedulePage() {
  const scheduleQuery = useMySchedule();

  // Build set "MONDAY|HOUR_8_9" để O(1) lookup khi render cell
  const occupied = new Set(
    (scheduleQuery.data ?? []).map((s) => `${s.workday}|${s.workHour}`),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lịch trực tuần</h1>
        <p className="text-sm text-muted-foreground">
          Khung giờ làm việc cố định trong tuần. Liên hệ admin nếu cần điều chỉnh.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tổng số khung giờ:{' '}
            {scheduleQuery.isLoading ? '…' : scheduleQuery.data?.length ?? 0}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {scheduleQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border bg-muted/50 px-2 py-1 text-left font-medium">
                    Khung giờ
                  </th>
                  {WORKDAY_ORDER.map((d) => (
                    <th
                      key={d}
                      className="border bg-muted/50 px-2 py-1 text-center font-medium"
                    >
                      {WORKDAY_LABEL[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WORKHOUR_ORDER.map((h) => (
                  <tr key={h}>
                    <td className="border px-2 py-1 font-medium">
                      {WORKHOUR_LABEL[h]}
                    </td>
                    {WORKDAY_ORDER.map((d) => {
                      const isOn = occupied.has(`${d}|${h}`);
                      return (
                        <td
                          key={d}
                          className={
                            'border px-2 py-1 text-center ' +
                            (isOn
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'text-muted-foreground/40')
                          }
                        >
                          {isOn ? '✓' : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
