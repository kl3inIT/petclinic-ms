/**
 * Vietnamese labels cho các enum/concept của vets-service. Orval không sinh i18n —
 * các Record này dùng trực tiếp trong UI (vd dropdown, badge label, schedule grid).
 *
 * Giữ in sync với enum BE:
 *  - Workday        → shared/common-jpa (theo Phase C)
 *  - WorkHour       → shared/common-jpa
 *  - BadgeTitle     → vets-service/model/BadgeTitle
 *
 * Khi BE thêm value mới, TypeScript sẽ báo missing key (Record<EnumType, string>) →
 * fail typecheck → buộc bổ sung — chủ ý làm vậy để không bỏ sót i18n.
 *
 * **Lưu ý**: Sau khi `pnpm fetch:openapi && pnpm generate:api` xuất các enum type
 * (`Workday`, `WorkHour`, `BadgeTitle`) vào `lib/api/generated/model/`, đổi `string`
 * dưới đây sang import type tương ứng để TS check exhaustive.
 */

// ─── Workday (Phase C) ──────────────────────────────────────────────────────────
export const WORKDAY_LABEL: Record<string, string> = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ Nhật',
};

export const WORKDAY_ORDER: string[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

// ─── WorkHour (Phase C) — slot 1 giờ từ 8h đến 20h ──────────────────────────────
export const WORKHOUR_LABEL: Record<string, string> = {
  HOUR_8_9: '8 - 9h',
  HOUR_9_10: '9 - 10h',
  HOUR_10_11: '10 - 11h',
  HOUR_11_12: '11 - 12h',
  HOUR_12_13: '12 - 13h',
  HOUR_13_14: '13 - 14h',
  HOUR_14_15: '14 - 15h',
  HOUR_15_16: '15 - 16h',
  HOUR_16_17: '16 - 17h',
  HOUR_17_18: '17 - 18h',
  HOUR_18_19: '18 - 19h',
  HOUR_19_20: '19 - 20h',
};

export const WORKHOUR_ORDER: string[] = [
  'HOUR_8_9', 'HOUR_9_10', 'HOUR_10_11', 'HOUR_11_12', 'HOUR_12_13', 'HOUR_13_14',
  'HOUR_14_15', 'HOUR_15_16', 'HOUR_16_17', 'HOUR_17_18', 'HOUR_18_19', 'HOUR_19_20',
];

// ─── BadgeTitle (Phase E1) ──────────────────────────────────────────────────────
export const BADGE_TITLE_LABEL: Record<string, string> = {
  ROOKIE: 'Tân binh',
  EXPERIENCED: 'Bác sĩ kinh nghiệm',
  MASTER: 'Bậc thầy',
  SURGERY_EXPERT: 'Chuyên gia phẫu thuật',
  RESEARCH_AWARD: 'Giải thưởng nghiên cứu',
  TOP_RATED: 'Bác sĩ được đánh giá cao',
};

// ─── Score star label (Phase D + F.1) ───────────────────────────────────────────
/** Helper hiển thị score dạng "5 ⭐" cho UI nhẹ. */
export function scoreStars(score: number): string {
  return `${score} ${'⭐'.repeat(score)}`;
}
