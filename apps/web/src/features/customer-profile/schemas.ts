import { z } from 'zod';

/**
 * Form đổi mật khẩu — match BE ChangePasswordRequest (currentPassword NotBlank,
 * newPassword 8-72 ký tự). Thêm confirm field client-side để chống typo.
 *
 * Policy: chữ thường + chữ hoa + số (recommendation enterprise, không enforce
 * ở BE vì pen-tester có thể bypass; FE chỉ guide UX).
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Bắt buộc'),
    newPassword: z
      .string()
      .min(8, 'Tối thiểu 8 ký tự')
      .max(72, 'Tối đa 72 ký tự')
      .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
      .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Cần ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Bắt buộc'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
