import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePetTypes } from './api';

interface Props {
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Dropdown chọn loại pet từ catalog `/api/v1/pet-types`.
 * value=undefined hoặc null đều biểu diễn "chưa chọn"; gửi undefined ra BE để bỏ qua.
 */
export function PetTypeSelect({ value, onChange, placeholder, disabled, id }: Props) {
  const { data, isLoading, isError } = usePetTypes();
  const items = data ?? [];
  const empty = !isLoading && items.length === 0;
  const effectivePlaceholder = isLoading
    ? 'Đang tải loại pet…'
    : isError
      ? 'Lỗi tải catalog'
      : empty
        ? 'Catalog trống — liên hệ admin'
        : (placeholder ?? 'Chọn loại…');

  return (
    <Select
      disabled={disabled || isLoading || empty || isError}
      value={value == null ? '' : String(value)}
      onValueChange={(v) => onChange(v ? Number(v) : undefined)}
    >
      {/* w-full để ô Loài rộng bằng input Tên (SelectTrigger mặc định là w-fit). */}
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={effectivePlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((pt) => (
          <SelectItem key={pt.id} value={String(pt.id)}>
            {pt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
