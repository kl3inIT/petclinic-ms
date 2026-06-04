import { z } from 'zod';

/**
 * Zod schemas cho các form của vets-service (Phase A-F.1). Match BE DTO record:
 *  - VetRequest, UpdateVetRequest (Phase A)
 *  - RatingRequest (Phase D, Phase F lấy customerName từ JWT, Phase F.1 UPSERT semantic)
 *  - EducationRequest (Phase B)
 *  - BadgeRequest (Phase E1)
 *
 * Tham khảo `features/visits/schemas.ts` cho convention:
 *  - z.coerce.number cho input number
 *  - Empty string ở form-state; strip về undefined khi submit
 *  - Defaults match Zod input type (TanStack Form Standard Schema strict)
 */

// ─── Vet form (Phase A) ─────────────────────────────────────────────────────────
export const vetSchema = z.object({
  firstName: z.string().min(1, 'Bắt buộc').max(255, 'Tối đa 255 ký tự'),
  lastName: z.string().min(1, 'Bắt buộc').max(255, 'Tối đa 255 ký tự'),
  email: z.string().min(1, 'Bắt buộc').email('Email không hợp lệ').max(255),
  phoneNumber: z.string().max(30, 'Tối đa 30 ký tự'),
  // Mã liên kết billing — optional, unique nếu có (BE trả 400 error.vetBillId-exists khi trùng)
  vetBillId: z.string().max(36, 'Tối đa 36 ký tự'),
  resume: z.string().max(10_000, 'Tối đa 10000 ký tự'),
});
export type VetInput = z.infer<typeof vetSchema>;

// ─── Rating form (Phase D + F.1 UPSERT) ─────────────────────────────────────────
/**
 * Customer rate vet — 1-5 sao. customerName từ JWT, KHÔNG nằm trong schema.
 * POST trùng (cùng user, cùng vet) → BE tự UPSERT (Phase F.1) — FE chỉ cần gọi
 * mutation lại; KHÔNG cần check existed trước.
 */
export const ratingSchema = z.object({
  score: z.coerce
    .number({ message: 'Chọn điểm 1-5' })
    .int('Điểm phải nguyên')
    .min(1, 'Tối thiểu 1 sao')
    .max(5, 'Tối đa 5 sao'),
  description: z.string().max(2000, 'Tối đa 2000 ký tự'),
});
export type RatingInput = z.infer<typeof ratingSchema>;

// ─── Education form (Phase B) ───────────────────────────────────────────────────
/**
 * end-date nullable BE → optional + "" → undefined ở submit. Validate
 * `endDate >= startDate` chạy ở BE (sau merge partial PATCH) — FE chỉ check cơ bản.
 */
export const educationSchema = z
  .object({
    schoolName: z.string().min(1, 'Bắt buộc').max(200),
    degree: z.string().min(1, 'Bắt buộc').max(100),
    fieldOfStudy: z.string().max(150),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
    endDate: z.string(),
  })
  .refine((v) => v.endDate === '' || new Date(v.endDate) >= new Date(v.startDate), {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['endDate'],
  });
export type EducationInput = z.infer<typeof educationSchema>;

// ─── Badge form (Phase E1) ──────────────────────────────────────────────────────
/** awardedDate không được trong tương lai (BE return 400 error.date-future). */
export const badgeSchema = z.object({
  title: z.string().min(1, 'Chọn loại huy hiệu'),
  awardedDate: z
    .string()
    .min(1, 'Chọn ngày trao')
    .refine((v) => new Date(v) <= new Date(), {
      message: 'Không được chọn ngày tương lai',
    }),
  description: z.string().max(2000),
});
export type BadgeInput = z.infer<typeof badgeSchema>;
