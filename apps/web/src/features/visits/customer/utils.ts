import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import type { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import type { SearchVisitsStatus } from '@/lib/api/generated/model';

/** Sentinel cho lựa chọn "tất cả" trong các Select lọc. */
export const ALL = 'ALL' as const;

export type StatusFilter = SearchVisitsStatus | typeof ALL;
export type MonthFilter = 'all' | 'current' | 'next' | 'past';
export type FeeFilter = 'all' | 'paid' | 'unpaid';
/** Lọc bác sĩ theo vetId thật (chuỗi hoá để dùng làm value cho Select); ALL = mọi bác sĩ. */
export type VetFilter = string;

/** Số visit hiển thị mỗi trang (phân trang client-side). */
export const PAGE_SIZE = 4;

export const fullDateFmt = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const timeFmt = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Khoảng giờ ước tính (mặc định 30') quanh thời điểm hẹn. */
export function timeRange(date: Date | null): string {
  if (!date) return '--:-- - --:--';
  const end = new Date(date);
  end.setMinutes(end.getMinutes() + 30);
  return `${timeFmt.format(date)} - ${timeFmt.format(end)}`;
}

/**
 * Tiêu đề visit — ưu tiên `reason` thật. Không bịa nội dung theo trạng thái;
 * fallback generic khi chưa có lý do khám.
 */
export function titleForVisit(visit: VisitResponse): string {
  return visit.reason?.trim() || 'Khám thú cưng';
}

export function hasVisitFee(visit: VisitResponse): boolean {
  return typeof visit.fee === 'number' && Number.isFinite(visit.fee);
}

export function formatVisitFee(visit: VisitResponse): string {
  if (!hasVisitFee(visit)) return 'Chưa phát sinh';
  return visit.fee!.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export function matchesMonthFilter(visit: VisitResponse, filter: MonthFilter): boolean {
  if (filter === 'all') return true;
  if (!visit.scheduledAt) return false;

  const date = new Date(visit.scheduledAt);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (filter === 'current') {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }

  if (filter === 'next') {
    const next = new Date(currentYear, currentMonth + 1, 1);
    return (
      date.getMonth() === next.getMonth() && date.getFullYear() === next.getFullYear()
    );
  }

  return date.getTime() < now.getTime();
}

export function timelineDot(status: VisitResponseStatus): string {
  const styles: Record<VisitResponseStatus, string> = {
    SCHEDULED: 'bg-violet-500',
    IN_PROGRESS: 'bg-orange-400',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-rose-500',
  };
  return styles[status];
}

/** Thông tin bác sĩ hiển thị — định nghĩa tại nguồn dùng chung. */
export type { VetInfo } from '@/features/vets/useVetMap';

/**
 * Kiểm tra xem lịch hẹn có nằm trong khoảng 12 tiếng kể từ hiện tại không.
 * Nếu `scheduledAt` còn < 12h → không cho phép huỷ hoặc đổi lịch.
 */
export function isWithin12Hours(visit: { scheduledAt?: string }): boolean {
  if (!visit.scheduledAt) return false;
  const diff = new Date(visit.scheduledAt).getTime() - Date.now();
  return diff >= 0 && diff < 12 * 60 * 60 * 1000;
}

/** Thông báo hiển thị khi lịch nằm trong vùng 12h không thể huỷ/đổi. */
export const WITHIN_12H_MESSAGE =
  'Lịch khám trong vòng 12 tiếng tới không thể huỷ hoặc đổi. Bạn có thể đặt lịch mới riêng.';
