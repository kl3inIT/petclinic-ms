import type { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';

/**
 * Status label tiếng Việt — orval không sinh i18n. Đặt riêng để component đọc.
 * Giữ in sync với enum BE `VisitStatus` (4 giá trị).
 */
export const VISIT_STATUS_LABEL: Record<VisitResponseStatus, string> = {
  SCHEDULED: 'Đã đặt',
  IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

/** Map giống/loài (BE lưu free-text tiếng Anh) → nhãn tiếng Việt. Fallback giữ nguyên giá trị gốc. */
const PET_SPECIES_LABEL: Record<string, string> = {
  dog: 'Chó',
  cat: 'Mèo',
  rabbit: 'Thỏ',
  hamster: 'Hamster',
  bird: 'Chim',
  fish: 'Cá',
  reptile: 'Bò sát',
};

/** Hiển thị giống thú cưng — dịch loài phổ biến, giữ nguyên nếu là tên giống cụ thể (vd "Poodle"). */
export function formatPetBreed(breed?: string | null): string | null {
  if (!breed) return null;
  return PET_SPECIES_LABEL[breed.toLowerCase()] ?? breed;
}

/**
 * Tính nhãn tuổi từ ngày sinh ISO ("2023-04-15"). ≥12 tháng → "N tuổi", <12 tháng → "N tháng".
 * Trả null khi không có/không hợp lệ.
 */
export function petAgeLabel(birthDate?: string | null): string | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  if (months < 0) return null;
  if (months < 12) return `${months} tháng`;
  return `${Math.floor(months / 12)} tuổi`;
}

/** Dòng phụ "Giống • Tuổi" cho cell thú cưng — gộp các phần có giá trị, bỏ phần trống. */
export function petMetaLine(
  breed?: string | null,
  birthDate?: string | null,
): string | null {
  const parts = [formatPetBreed(breed), petAgeLabel(birthDate)].filter(Boolean);
  return parts.length ? parts.join(' • ') : null;
}

/** 1-2 ký tự initials từ tên (cho avatar fallback). */
export function initials(name?: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

/** Màu nền avatar ổn định theo tên (hash → palette). */
export function avatarColor(name?: string | null): string {
  const palette = [
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-fuchsia-100 text-fuchsia-700',
  ];
  const key = name ?? '';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length]!;
}
