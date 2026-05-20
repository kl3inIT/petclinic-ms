import type { AnyFieldApi } from '@tanstack/react-form';

/**
 * Render TanStack Form field errors as text. Standard-schema (Zod) validators
 * emit StandardSchemaV1Issue objects; non-schema validators may emit strings.
 * Chỉ hiện khi field đã touched để tránh đỏ ngay khi mở form.
 */
export function FieldError({ field }: { field: AnyFieldApi }) {
  if (!field.state.meta.isTouched) return null;
  const msg = (field.state.meta.errors as unknown[])
    .map((e): string => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
        return e.message;
      }
      return '';
    })
    .filter(Boolean)
    .join(', ');
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}
