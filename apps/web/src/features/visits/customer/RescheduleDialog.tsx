import { Link } from '@tanstack/react-router';
import { AlertTriangle, Calendar, Trash2 } from 'lucide-react';

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
import {
  fullDateFmt,
  isWithin12Hours,
  timeRange,
  titleForVisit,
  WITHIN_12H_MESSAGE,
} from './utils';

/**
 * "Đổi lịch" tạm thời = đặt lịch mới + huỷ lịch cũ (BE chưa có reschedule nguyên tử).
 * Nếu lịch trong vòng 12h → cả hai hành động bị khoá, chỉ hiện banner giải thích.
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
  const locked = visit ? isWithin12Hours(visit) : false;

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

            {/* Banner cảnh báo 12h */}
            {locked && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    Không thể huỷ hoặc đổi lịch
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">{WITHIN_12H_MESSAGE}</p>
                </div>
              </div>
            )}

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
            <Button
              variant="outline"
              disabled={locked}
              title={locked ? WITHIN_12H_MESSAGE : undefined}
              onClick={() => onCancelOldVisit(visit)}
            >
              Huỷ lịch cũ
            </Button>
          ) : null}
          {/* Trong 12h: disable nút đặt lịch mới tại dialog, kèm tooltip */}
          <Button
            asChild={!locked}
            disabled={locked}
            title={locked ? WITHIN_12H_MESSAGE : undefined}
          >
            {locked ? (
              <span>Đặt lịch mới</span>
            ) : (
              <Link to="/customer/book">Đặt lịch mới</Link>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
