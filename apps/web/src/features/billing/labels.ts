import type {
  InvoiceResponseStatus,
  InvoiceItemResponseSourceType,
  InvoiceResponsePaymentMethod,
} from '@/lib/api/generated/model';

/** Nhãn + màu badge cho trạng thái hoá đơn. */
export const INVOICE_STATUS_LABEL: Record<InvoiceResponseStatus, string> = {
  OPEN: 'Đang mở',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã huỷ',
};

export const INVOICE_STATUS_CLASS: Record<InvoiceResponseStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

/** Nhãn nguồn dòng chi phí. */
export const ITEM_SOURCE_LABEL: Record<InvoiceItemResponseSourceType, string> = {
  VISIT_FEE: 'Phí khám',
  DISEASE: 'Điều trị bệnh',
  MEDICATION: 'Thuốc',
  PRODUCT: 'Sản phẩm',
  MISC: 'Khác',
};

export const ITEM_SOURCE_CLASS: Record<InvoiceItemResponseSourceType, string> = {
  VISIT_FEE: 'bg-blue-100 text-blue-700',
  DISEASE: 'bg-violet-100 text-violet-700',
  MEDICATION: 'bg-teal-100 text-teal-700',
  PRODUCT: 'bg-orange-100 text-orange-700',
  MISC: 'bg-slate-100 text-slate-600',
};

/** Nhãn hình thức thanh toán. */
export const PAYMENT_METHOD_LABEL: Record<InvoiceResponsePaymentMethod, string> = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ',
  TRANSFER: 'Chuyển khoản',
};
