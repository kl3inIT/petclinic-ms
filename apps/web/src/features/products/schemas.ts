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
  type: z.enum(['MEDICATION', 'SERVICE', 'SUPPLY', 'MERCHANDISE']),
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
