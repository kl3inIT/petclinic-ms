import { z } from 'zod';

// Note: tránh `.refine()` trong chain — ZodEffects làm input type của StandardSchemaV1
// (mà TanStack Form đọc) bị "unknown", gây type incompatibility. Dùng `.regex` thay vì refine.

export const saveLlmConfigSchema = z.object({
  baseUrl: z
    .string()
    .min(1, 'Base URL không được trống')
    .max(256, 'Base URL quá dài')
    .regex(/^https?:\/\/.+/, 'Phải bắt đầu bằng http:// hoặc https://'),
  apiKey: z
    .string()
    .min(10, 'API key tối thiểu 10 ký tự')
    .max(1024, 'API key quá dài'),
  chatModel: z
    .string()
    .min(1, 'Chat model không được trống')
    .max(128, 'Chat model quá dài')
    .regex(/^[\w./:-]+$/, 'Chỉ chứa alphanumeric + . / : -'),
});

export type SaveLlmConfigInput = z.infer<typeof saveLlmConfigSchema>;
