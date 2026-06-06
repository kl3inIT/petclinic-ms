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

/** Map loại pet (text từ Pet.type) → emoji hiển thị. Fallback dấu chân chung. */
export function petEmoji(type?: string | null): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('dog') || t.includes('chó')) return '🐶';
  if (t.includes('cat') || t.includes('mèo')) return '🐱';
  if (t.includes('rabbit') || t.includes('thỏ')) return '🐰';
  if (t.includes('bird') || t.includes('chim')) return '🐦';
  if (t.includes('parrot') || t.includes('vẹt')) return '🦜';
  if (t.includes('hamster') || t.includes('guinea') || t.includes('chuột lang'))
    return '🐹';
  if (t.includes('fish') || t.includes('cá')) return '🐠';
  if (
    t.includes('reptile') ||
    t.includes('bò sát') ||
    t.includes('snake') ||
    t.includes('rắn')
  )
    return '🐍';
  if (t.includes('turtle') || t.includes('rùa')) return '🐢';
  if (t.includes('ferret') || t.includes('chồn')) return '🦨';
  if (t.includes('squirrel') || t.includes('sóc')) return '🐿️';
  return '🐾';
}

/** Nhãn loài thú cưng tiếng Việt từ Pet.type free-text. Fallback giữ nguyên giá trị gốc. */
export function petTypeLabel(type?: string | null): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('dog') || t.includes('chó')) return 'Chó';
  if (t.includes('cat') || t.includes('mèo')) return 'Mèo';
  if (t.includes('rabbit') || t.includes('thỏ')) return 'Thỏ';
  if (t.includes('bird') || t.includes('chim')) return 'Chim';
  if (t.includes('parrot') || t.includes('vẹt')) return 'Vẹt';
  if (t.includes('hamster')) return 'Hamster';
  if (t.includes('guinea') || t.includes('chuột lang')) return 'Chuột lang';
  if (t.includes('fish') || t.includes('cá')) return 'Cá';
  if (t.includes('reptile') || t.includes('bò sát')) return 'Bò sát';
  if (t.includes('turtle') || t.includes('rùa')) return 'Rùa';
  if (t.includes('snake') || t.includes('rắn')) return 'Rắn';
  if (t.includes('ferret') || t.includes('chồn')) return 'Chồn';
  if (t.includes('squirrel') || t.includes('sóc')) return 'Sóc';
  return type || 'Thú cưng';
}

/** Chuyên khoa bác sĩ (BE lưu free-text tiếng Anh) → nhãn tiếng Việt. Fallback giữ nguyên (best-effort). */
const SPECIALTY_VN: Record<string, string> = {
  radiology: 'Chẩn đoán hình ảnh',
  surgery: 'Ngoại khoa',
  'internal medicine': 'Nội khoa',
  dentistry: 'Nha khoa',
  dermatology: 'Da liễu',
  cardiology: 'Tim mạch',
  oncology: 'Ung bướu',
  neurology: 'Thần kinh',
};

/** Dịch tên chuyên khoa sang tiếng Việt; không khớp → giữ nguyên. */
export function vnSpecialty(name?: string | null): string {
  if (!name) return '';
  return SPECIALTY_VN[name.toLowerCase()] ?? name;
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
