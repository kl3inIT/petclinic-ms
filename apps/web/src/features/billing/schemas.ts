import { z } from 'zod';

/** Match BE CreateDiseaseRequest/UpdateDiseaseRequest. */
export const diseaseFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Bắt buộc')
    .max(50, 'Tối đa 50 ký tự')
    .regex(/^[A-Z0-9_]+$/, 'Chữ HOA, số và _'),
  name: z.string().trim().min(1, 'Bắt buộc').max(150, 'Tối đa 150 ký tự'),
  category: z.string().trim().max(80, 'Tối đa 80 ký tự'),
  description: z.string().trim().max(2000, 'Tối đa 2000 ký tự'),
  baseCost: z.number().nonnegative('Phải ≥ 0'),
  active: z.boolean(),
});

export type DiseaseFormInput = z.infer<typeof diseaseFormSchema>;

/** Dòng tự do (đồ shop / phụ phí) thêm vào hoá đơn ở quầy. */
export const miscItemFormSchema = z.object({
  description: z.string().trim().min(1, 'Bắt buộc').max(255, 'Tối đa 255 ký tự'),
  unitPrice: z.number().nonnegative('Phải ≥ 0'),
  quantity: z.number().int().positive('Phải > 0'),
});

export type MiscItemFormInput = z.infer<typeof miscItemFormSchema>;
