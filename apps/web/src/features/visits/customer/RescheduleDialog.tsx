import { Link } from '@tanstack/react-router';
import { Calendar, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';

import { InfoTile } from './parts';
import { fullDateFmt, timeRange, titleForVisit } from './utils';

/**
 * "Đổi lịch" tạm thời = đặt lịch mới + huỷ lịch cũ (BE chưa có reschedule nguyên tử).
 */
export function RescheduleDialog({
  visit,
  onOpenChange,
  onCancelOldVisit,
}: {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
  onCancelOldVisit: (visit: VisitResponse) => void;
}) {
  const date = visit?.scheduledAt ? new Date(visit.scheduledAt) : null;

  return (
    <Dialog open={visit !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-slate-950">
            Đổi lịch khám
          </DialogTitle>
          <DialogDescription>
            Hệ thống hiện hỗ trợ đặt lịch mới và huỷ lịch cũ để hoàn tất đổi lịch.
          </DialogDescription>
        </DialogHeader>

        {visit ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Lịch hiện tại
              </p>
              <p className="mt-2 font-extrabold text-slate-950">{titleForVisit(visit)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {date ? fullDateFmt.format(date) : '-'} • {timeRange(date)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={Calendar}
                label="Bước 1"
                value="Đặt lịch mới ở form đặt lịch"
              />
              <InfoTile
                icon={Trash2}
                label="Bước 2"
                value="Huỷ lịch cũ sau khi xác nhận"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Để sau</Button>
          </DialogClose>
          {visit ? (
            <Button variant="outline" onClick={() => onCancelOldVisit(visit)}>
              Huỷ lịch cũ
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/customer/book">Đặt lịch mới</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
