import type { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';

/**
 * Status label tiếng Việt — orval không sinh i18n. Đặt riêng để component đọc.
 * Giữ in sync với enum BE `VisitStatus` (4 giá trị).
 */
export const VISIT_STATUS_LABEL: Record<VisitResponseStatus, string> = {
  SCHEDULED: 'Đã đặt',
  IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
