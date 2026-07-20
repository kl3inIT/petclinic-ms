import { z } from 'zod';

/** Match BE CreateProductRequest/UpdateProductRequest. */
export const productFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Bắt buộc')
    .max(50, 'Tối đa 50 ký tự')
    .regex(/^[A-Z0-9_]+$/, 'Chữ HOA, số và _'),
  name: z.string().trim().min(1, 'Bắt buộc').max(150, 'Tối đa 150 ký tự'),
  category: z.string().trim().max(80, 'Tối đa 80 ký tự'),
  description: z.string().trim().max(2000, 'Tối đa 2000 ký tự'),
  type: z.enum(['MEDICATION', 'VACCINE', 'SERVICE', 'SUPPLY', 'MERCHANDISE']),
  unitPrice: z.number().nonnegative('Phải ≥ 0'),
  unit: z.string().trim().max(30, 'Tối đa 30 ký tự'),
  stockQuantity: z.number().int().nonnegative('Phải ≥ 0'),
  reorderLevel: z.number().int().nonnegative('Phải ≥ 0'),
  active: z.boolean(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

/** Nhập thêm tồn kho. */
export const restockFormSchema = z.object({
  quantity: z.number().int().positive('Phải > 0'),
});

export type RestockFormInput = z.infer<typeof restockFormSchema>;

const stockDocumentLineSchema = z.object({
  productId: z.number().int().positive('Vui lòng chọn sản phẩm'),
  quantity: z.number().int().positive('Phải > 0'),
});

/** Phiếu nhập/xuất kho thủ công có nhiều dòng hàng và đủ thông tin truy vết. */
export const stockDocumentFormSchema = z
  .object({
    items: z
      .array(stockDocumentLineSchema)
      .min(1, 'Phiếu phải có ít nhất một dòng')
      .max(100),
    reason: z.string().trim().min(1, 'Vui lòng nhập lý do').max(255, 'Tối đa 255 ký tự'),
    reference: z.string().trim().max(120, 'Tối đa 120 ký tự'),
  })
  .superRefine((value, context) => {
    const seen = new Set<number>();
    value.items.forEach((item, index) => {
      if (item.productId > 0 && seen.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'Sản phẩm đã có trong phiếu',
          path: ['items', index, 'productId'],
        });
      }
      seen.add(item.productId);
    });
  });

export type StockDocumentFormInput = z.infer<typeof stockDocumentFormSchema>;
