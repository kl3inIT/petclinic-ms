import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập username'),
  password: z.string().min(1, 'Vui lòng nhập password'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    username: z.string().min(3, 'Tối thiểu 3 ký tự').max(100),
    email: z.string().email('Email không hợp lệ').max(100),
    password: z.string().min(8, 'Tối thiểu 8 ký tự').max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Password không khớp',
  });

export type RegisterValues = z.infer<typeof registerSchema>;
