import {
  Calendar,
  CalendarCheck,
  Clock3,
  Copy,
  MoreVertical,
  PawPrint,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { cn } from '@/lib/utils';

import { petEmoji } from '../labels';
import { StatusPill } from './parts';
import {
  fullDateFmt,
  isWithin12Hours,
  timeFmt,
  timeRange,
  timelineDot,
  titleForVisit,
  WITHIN_12H_MESSAGE,
  type VetInfo,
} from './utils';

export function CustomerVisitRow({
  visit,
  vetMap,
  petPhotoUrl,
  onDetail,
  onReschedule,
  onCancel,
  onRate,
}: {
  visit: VisitResponse;
  vetMap: Map<number, VetInfo>;
  /** Ảnh thú cưng từ MinIO — load từ ownerPets.photoUrl. Null = dùng emoji fallback. */
  petPhotoUrl?: string | null;
  onDetail: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onRate: () => void;
}) {
  const date = visit.scheduledAt ? new Date(visit.scheduledAt) : null;
  const status = visit.status ?? VisitResponseStatus.SCHEDULED;
  const canCancel =
    status === VisitResponseStatus.SCHEDULED ||
    status === VisitResponseStatus.IN_PROGRESS;
  const canRate = status === VisitResponseStatus.COMPLETED && visit.vetId !== undefined;
  const title = titleForVisit(visit);
  const vet = visit.vetId !== undefined ? vetMap.get(visit.vetId) : undefined;
  const doctorName =
    visit.vetId !== undefined ? (vet?.fullName ?? `BS #${visit.vetId}`) : null;

  /** Lịch trong 12h tới → khoá huỷ / đổi lịch */
  const locked = canCancel && isWithin12Hours(visit);

  return (
    <div className="grid gap-3 lg:grid-cols-[78px_1fr] lg:items-stretch">
      <div className="hidden items-start gap-3 pt-3 lg:flex">
        <span className={cn('mt-2 size-3 rounded-full', timelineDot(status))} />
        <div className="leading-tight">
          <div className="text-2xl font-extrabold text-slate-900">
            {date ? date.toLocaleDateString('vi-VN', { day: '2-digit' }) : '--'}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {date ? `Th${date.getMonth() + 1}, ${date.getFullYear()}` : 'Chưa rõ'}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {date ? timeFmt.format(date) : '--:--'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] transition hover:border-primary/40 hover:shadow-[0_14px_34px_rgba(104,93,199,0.10)] md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          {/* Avatar pet — ảnh từ MinIO nếu có, emoji fallback */}
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-amber-100 to-orange-200 text-3xl shadow-sm">
            {petPhotoUrl ? (
              <img
                src={petPhotoUrl}
                alt={visit.petName ?? 'pet'}
                className="size-full object-cover"
              />
            ) : (
              <span>{petEmoji(visit.petBreed)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-slate-950">
              {visit.petName ? `${visit.petName} — ${title}` : title}
            </h3>
            {doctorName || vet?.specialty ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                {doctorName ? (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5" />
                    {doctorName}
                  </span>
                ) : null}
                {vet?.specialty ? <span>{vet.specialty}</span> : null}
              </div>
            ) : null}
            {/* Badge cảnh báo 12h (nhỏ gọn trong row) */}
            {locked && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <PawPrint className="size-2.5" />
                Không thể huỷ / đổi lịch (trong 12h)
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[170px_110px_auto] md:items-center">
          <div className="space-y-1 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-slate-400" />
              <span>{date ? fullDateFmt.format(date) : 'Chưa có lịch'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-slate-400" />
              <span>{timeRange(date)}</span>
            </div>
          </div>

          <StatusPill status={status} />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 px-4 text-xs font-bold text-primary hover:bg-primary/10"
              onClick={onDetail}
            >
              Xem chi tiết
            </Button>
            {canCancel ? (
              <Button
                size="sm"
                className="px-5 text-xs font-bold"
                onClick={onReschedule}
                title={locked ? WITHIN_12H_MESSAGE : undefined}
              >
                Đổi lịch
              </Button>
            ) : null}
            {canRate ? (
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-400 px-3 text-xs font-bold text-yellow-700 hover:bg-yellow-50"
                onClick={onRate}
              >
                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                Đánh giá
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-slate-500">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onDetail}>
                  <CalendarCheck className="size-4" />
                  Xem hồ sơ khám
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReschedule} disabled={!canCancel}>
                  <Calendar className="size-4" />
                  Đổi lịch
                  {locked && (
                    <span className="ml-auto text-[10px] text-amber-500">12h</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRate} disabled={!canRate}>
                  <Star className="size-4" />
                  Đánh giá bác sĩ
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void navigator.clipboard?.writeText(`#${visit.id ?? ''}`);
                    toast.success('Đã sao chép mã lịch');
                  }}
                >
                  <Copy className="size-4" />
                  Sao chép mã
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onCancel}
                  disabled={!canCancel || locked}
                  title={locked ? WITHIN_12H_MESSAGE : undefined}
                >
                  <Trash2 className="size-4" />
                  Huỷ lịch
                  {locked && (
                    <span className="ml-auto text-[10px] text-amber-500">12h</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
