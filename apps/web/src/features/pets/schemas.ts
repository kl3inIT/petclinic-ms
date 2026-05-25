import { z } from 'zod';

/**
 * Match PetRequest record BE: name + type @NotBlank, birthDate @PastOrPresent,
 * weight @DecimalMin(0.0). petTypeId là Long FK (catalog), null = chưa chọn.
 * Form value type khớp với defaultValues — null thay vì undefined cho field
 * không bắt buộc, để TanStack Form type stable.
 */
export const petFormSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc').max(80, 'Tối đa 80 ký tự'),
  type: z.string().trim().min(1, 'Bắt buộc').max(50, 'Tối đa 50 ký tự'),
  birthDate: z.string().refine((v) => v === '' || new Date(v) <= new Date(), {
    message: 'Không thể trong tương lai',
  }),
  petTypeId: z.number().int().positive().nullable(),
  isActive: z.boolean(),
  weight: z.number().nonnegative('Phải ≥ 0').nullable(),
  photoId: z.string().max(100, 'Tối đa 100 ký tự'),
});

export type PetFormInput = z.infer<typeof petFormSchema>;
