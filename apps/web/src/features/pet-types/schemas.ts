import { z } from 'zod';

/**
 * Match BE PetTypeRequest: code @Pattern slug, name @NotBlank, displayOrder >= 0.
 */
export const petTypeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Bắt buộc')
    .max(50, 'Tối đa 50 ký tự')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Chữ thường, số, _ và -'),
  name: z.string().trim().min(1, 'Bắt buộc').max(100, 'Tối đa 100 ký tự'),
  displayOrder: z.number().int().min(0, 'Phải ≥ 0'),
});

export type PetTypeFormInput = z.infer<typeof petTypeFormSchema>;
