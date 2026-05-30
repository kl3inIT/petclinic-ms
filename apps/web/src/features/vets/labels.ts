import type {
  BadgeResponseTitle,
  WorkScheduleSlotResponseWorkHour,
  WorkScheduleSlotResponseWorkday,
} from '@/lib/api/generated/model';

export const WORKDAY_LABEL: Record<WorkScheduleSlotResponseWorkday, string> = {
  MONDAY: 'Thứ Hai',
  TUESDAY: 'Thứ Ba',
  WEDNESDAY: 'Thứ Tư',
  THURSDAY: 'Thứ Năm',
  FRIDAY: 'Thứ Sáu',
  SATURDAY: 'Thứ Bảy',
  SUNDAY: 'Chủ Nhật',
};

export const WORKDAY_ORDER: WorkScheduleSlotResponseWorkday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const JS_DAY_TO_WORKDAY: Record<number, WorkScheduleSlotResponseWorkday> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export const WORKHOUR_LABEL: Record<WorkScheduleSlotResponseWorkHour, string> = {
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

export const WORKHOUR_ORDER: WorkScheduleSlotResponseWorkHour[] = [
  'HOUR_8_9',
  'HOUR_9_10',
  'HOUR_10_11',
  'HOUR_11_12',
  'HOUR_12_13',
  'HOUR_13_14',
  'HOUR_14_15',
  'HOUR_15_16',
  'HOUR_16_17',
  'HOUR_17_18',
  'HOUR_18_19',
  'HOUR_19_20',
];

export const BADGE_TITLE_LABEL: Record<BadgeResponseTitle, string> = {
  ROOKIE: 'Tân binh',
  EXPERIENCED: 'Bác sĩ kinh nghiệm',
  MASTER: 'Bậc thầy',
  SURGERY_EXPERT: 'Chuyên gia phẫu thuật',
  RESEARCH_AWARD: 'Giải thưởng nghiên cứu',
  TOP_RATED: 'Bác sĩ được đánh giá cao',
};

export function scoreStars(score: number): string {
  return `${score} ${'⭐'.repeat(score)}`;
}
