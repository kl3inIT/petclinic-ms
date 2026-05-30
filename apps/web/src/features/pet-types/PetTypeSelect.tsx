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
  const { data, isLoading } = usePetTypes();

  return (
    <Select
      disabled={disabled || isLoading}
      value={value == null ? '' : String(value)}
      onValueChange={(v) => onChange(v ? Number(v) : undefined)}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder ?? 'Chọn loại…'} />
      </SelectTrigger>
      <SelectContent>
        {(data ?? []).map((pt) => (
          <SelectItem key={pt.id} value={String(pt.id)}>
            {pt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
