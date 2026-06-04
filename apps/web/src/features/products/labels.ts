import type {
  ProductResponseType,
  ProductResponseStockStatus,
} from '@/lib/api/generated/model';

/** Nhãn loại sản phẩm. */
export const PRODUCT_TYPE_LABEL: Record<ProductResponseType, string> = {
  MEDICATION: 'Thuốc',
  SERVICE: 'Dịch vụ',
  SUPPLY: 'Vật tư',
  MERCHANDISE: 'Hàng bán lẻ',
};

export const PRODUCT_TYPE_CLASS: Record<ProductResponseType, string> = {
  MEDICATION: 'bg-teal-100 text-teal-700',
  SERVICE: 'bg-blue-100 text-blue-700',
  SUPPLY: 'bg-amber-100 text-amber-700',
  MERCHANDISE: 'bg-pink-100 text-pink-700',
};

/** Nhãn + màu badge trạng thái tồn kho (null = không quản lý tồn, vd dịch vụ). */
export const STOCK_STATUS_LABEL: Record<ProductResponseStockStatus, string> = {
  AVAILABLE: 'Còn hàng',
  LOW: 'Sắp hết',
  OUT: 'Hết hàng',
};

export const STOCK_STATUS_CLASS: Record<ProductResponseStockStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  LOW: 'bg-amber-100 text-amber-700',
  OUT: 'bg-rose-100 text-rose-700',
};
