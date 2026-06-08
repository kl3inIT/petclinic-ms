import { Calendar, Clock3, Star, UserRound } from 'lucide-react';

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
import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';

import { petEmoji } from '../labels';
import { InfoTile, ResultBlock, StatusPill } from './parts';
import {
  formatVisitFee,
  fullDateFmt,
  timeRange,
  titleForVisit,
  type VetInfo,
} from './utils';

export function CustomerVisitDetailDialog({
  visit,
  vetMap,
  onOpenChange,
  onReschedule,
  onCancel,
  onRate,
}: {
  visit: VisitResponse | null;
  vetMap: Map<number, VetInfo>;
  onOpenChange: (open: boolean) => void;
  onReschedule: (visit: VisitResponse) => void;
  onCancel: (visit: VisitResponse) => void;
  onRate: (visit: VisitResponse) => void;
}) {
  const date = visit?.scheduledAt ? new Date(visit.scheduledAt) : null;
  const status = visit?.status ?? VisitResponseStatus.SCHEDULED;
  const canCancel =
    status === VisitResponseStatus.SCHEDULED ||
    status === VisitResponseStatus.IN_PROGRESS;
  const canRate = status === VisitResponseStatus.COMPLETED && visit?.vetId !== undefined;
  const vet = visit?.vetId !== undefined ? vetMap.get(visit.vetId) : undefined;
  const doctorName =
    visit?.vetId !== undefined ? (vet?.fullName ?? `BS #${visit.vetId}`) : null;

  return (
    <Dialog open={visit !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl p-0">
        <DialogHeader className="border-b border-slate-100 p-6">
          <DialogTitle className="text-2xl font-extrabold text-slate-950">
            Chi tiết lịch khám #{visit?.id}
          </DialogTitle>
          <DialogDescription>
            Thông tin lịch hẹn, bác sĩ phụ trách và kết quả khám.
          </DialogDescription>
        </DialogHeader>

        {visit ? (
          <div className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-4 rounded-xl bg-violet-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-14 place-items-center rounded-full bg-white text-3xl shadow-sm">
                  {petEmoji(visit.petBreed)}
                </div>
                <div>
                  <p className="text-lg font-extrabold text-slate-950">
                    {titleForVisit(visit)}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {visit.petName ?? 'Thú cưng'}
                    {visit.petId !== undefined ? ` • Pet #${visit.petId}` : ''}
                  </p>
                </div>
              </div>
              <StatusPill status={status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={Calendar}
                label="Ngày khám"
                value={date ? fullDateFmt.format(date) : '-'}
              />
              <InfoTile icon={Clock3} label="Giờ khám" value={timeRange(date)} />
              {doctorName ? (
                <InfoTile icon={UserRound} label="Bác sĩ" value={doctorName} />
              ) : null}
              {vet?.specialty ? (
                <InfoTile icon={Star} label="Chuyên khoa" value={vet.specialty} />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ResultBlock label="Lý do khám" value={visit.reason || 'Chưa cập nhật'} />
              <ResultBlock label="Chẩn đoán" value={visit.diagnosis || 'Chưa cập nhật'} />
              <ResultBlock label="Điều trị" value={visit.treatment || 'Chưa cập nhật'} />
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Phí khám
              </p>
              <p className="mt-1 text-2xl font-extrabold text-primary">
                {formatVisitFee(visit)}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t border-slate-100 p-6">
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
          {visit && canCancel ? (
            <>
              <Button variant="outline" onClick={() => onCancel(visit)}>
                Huỷ lịch
              </Button>
              <Button onClick={() => onReschedule(visit)}>Đổi lịch</Button>
            </>
          ) : null}
          {visit && canRate ? (
            <Button
              className="bg-yellow-500 text-white hover:bg-yellow-600"
              onClick={() => onRate(visit)}
            >
              <Star className="size-4 fill-white text-white" />
              Đánh giá bác sĩ
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
