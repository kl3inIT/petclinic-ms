import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eraser, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import {
  getListVetWorkScheduleQueryKey,
  useClearVetWorkSchedule,
  useListVetWorkSchedule,
  useReplaceVetWorkSchedule,
} from '@/lib/api/generated/vet-work-schedule/vet-work-schedule';
import type {
  WorkScheduleSlotResponseWorkHour,
  WorkScheduleSlotResponseWorkday,
} from '@/lib/api/generated/model';
import { WORKDAY_LABEL, WORKDAY_ORDER, WORKHOUR_LABEL, WORKHOUR_ORDER } from '../labels';
import { cn } from '@/lib/utils';

interface Props {
  vetId: number;
}

type SlotKey = `${WorkScheduleSlotResponseWorkday}__${WorkScheduleSlotResponseWorkHour}`;

function key(
  d: WorkScheduleSlotResponseWorkday,
  h: WorkScheduleSlotResponseWorkHour,
): SlotKey {
  return `${d}__${h}`;
}

export function VetScheduleTab({ vetId }: Props) {
  const qc = useQueryClient();
  const listQuery = useListVetWorkSchedule(vetId);
  const [selected, setSelected] = useState<Set<SlotKey>>(new Set());

  const initialSet = useMemo(() => {
    const s = new Set<SlotKey>();
    listQuery.data?.forEach((slot) => {
      if (slot.workday && slot.workHour) {
        s.add(key(slot.workday, slot.workHour));
      }
    });
    return s;
  }, [listQuery.data]);

  useEffect(() => {
    setSelected(new Set(initialSet));
  }, [initialSet]);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: getListVetWorkScheduleQueryKey(vetId) });
  }

  const replaceMutation = useReplaceVetWorkSchedule({
    mutation: {
      onSuccess: () => {
        toast.success('Đã lưu lịch trực');
        invalidate();
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const clearMutation = useClearVetWorkSchedule({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa toàn bộ lịch');
        setSelected(new Set());
        invalidate();
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  function toggle(
    d: WorkScheduleSlotResponseWorkday,
    h: WorkScheduleSlotResponseWorkHour,
  ) {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(d, h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function save() {
    const slots = Array.from(selected).map((k) => {
      const [workday, workHour] = k.split('__');
      return {
        workday: workday as WorkScheduleSlotResponseWorkday,
        workHour: workHour as WorkScheduleSlotResponseWorkHour,
      };
    });
    replaceMutation.mutate({ vetId, data: { slots } });
  }

  const dirty = useMemo(() => {
    if (selected.size !== initialSet.size) return true;
    for (const k of selected) if (!initialSet.has(k)) return true;
    return false;
  }, [selected, initialSet]);

  if (listQuery.isLoading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Bấm vào ô để bật/tắt khung giờ trực. Lưu = ghi đè toàn bộ lịch (PUT replace).
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Đã chọn <strong>{selected.size}</strong> /{' '}
            {WORKDAY_ORDER.length * WORKHOUR_ORDER.length} khung
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => clearMutation.mutate({ vetId })}
            disabled={clearMutation.isPending || replaceMutation.isPending}
          >
            <Eraser />
            Xóa hết
          </Button>
          <Button
            onClick={save}
            disabled={!dirty || replaceMutation.isPending || clearMutation.isPending}
          >
            <Save />
            Lưu lịch
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background p-2 text-left">Giờ</th>
                {WORKDAY_ORDER.map((d) => (
                  <th key={d} className="p-2 text-center">
                    {WORKDAY_LABEL[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WORKHOUR_ORDER.map((h) => (
                <tr key={h} className="border-t">
                  <td className="sticky left-0 z-10 bg-background p-2 font-medium">
                    {WORKHOUR_LABEL[h]}
                  </td>
                  {WORKDAY_ORDER.map((d) => {
                    const on = selected.has(key(d, h));
                    return (
                      <td key={d} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(d, h)}
                          className={cn(
                            'size-7 rounded border transition-colors',
                            on
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/20 hover:bg-muted',
                          )}
                          aria-label={`${WORKDAY_LABEL[d]} ${WORKHOUR_LABEL[h]}`}
                        >
                          {on ? '✓' : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
