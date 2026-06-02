import { z } from 'zod';

/**
 * Zod schema cho Book Visit form. Match BookVisitRequest record bên BE:
 *   petId (Long, required), vetId (Long, required),
 *   scheduledAt (Instant, future), reason (String, optional ≤ 500)
 */
export const bookVisitSchema = z.object({
  petId: z.coerce.number({ message: 'Bắt buộc' }).int().positive('Bắt buộc'),
  vetId: z.coerce.number({ message: 'Bắt buộc' }).int().positive('Bắt buộc'),
  // datetime-local sinh ra "YYYY-MM-DDTHH:MM" (no seconds, no zone) — chuyển sang ISO ở mutation.
  scheduledAt: z
    .string()
    .min(1, 'Chọn thời gian')
    .refine((v) => new Date(v).getTime() > Date.now(), {
      message: 'Phải là thời gian trong tương lai',
    })
    .refine((v) => new Date(v).getMinutes() === 0, {
      message: 'Chọn khung giờ bắt đầu đúng đầu giờ',
    }),
  // Empty string ở form-state; strip về undefined ở submit để không gửi key rỗng.
  reason: z.string().max(500, 'Tối đa 500 ký tự'),
});

export type BookVisitInput = z.infer<typeof bookVisitSchema>;

/**
 * Complete Visit — diagnosis @NotBlank bên BE, treatment optional, fee ≥ 0.
 * serviceProductId: chọn dịch vụ khám trong catalog (BE lấy fee từ đơn giá); 0 = nhập tay.
 */
export const completeVisitSchema = z.object({
  diagnosis: z.string().min(1, 'Bắt buộc').max(4000),
  treatment: z.string().max(4000),
  fee: z.coerce.number({ message: 'Nhập số' }).nonnegative('Phải ≥ 0'),
  serviceProductId: z.coerce.number().int().nonnegative(),
});

export type CompleteVisitInput = z.infer<typeof completeVisitSchema>;
