import { z } from 'zod';

/**
 * Match OwnerRequest record BE: firstName/lastName @NotBlank, address/city/telephone optional.
 */
export const ownerFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Bắt buộc').max(60, 'Tối đa 60 ký tự'),
  lastName: z.string().trim().min(1, 'Bắt buộc').max(60, 'Tối đa 60 ký tự'),
  // Strings không optional — defaultValues là '' để form state ổn định, strip empty ở submit.
  address: z.string().max(200, 'Tối đa 200 ký tự'),
  city: z.string().max(80, 'Tối đa 80 ký tự'),
  telephone: z
    .string()
    .max(20, 'Tối đa 20 ký tự')
    .regex(/^[0-9 +()-]*$/, { message: 'Chỉ số và dấu + - ( )' }),
});

export type OwnerFormInput = z.infer<typeof ownerFormSchema>;
