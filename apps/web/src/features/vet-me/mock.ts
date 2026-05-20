/**
 * Mock data cho /vet/* portal — dùng khi account chưa link vet entity ở BE
 * (token thiếu claim vetId → endpoint /me trả 400). User bật "demo mode" qua
 * button trong error state → localStorage flag → hooks trả mock thay vì API call.
 *
 * KHÔNG dùng trong prod path — chỉ dev UX để xem template UI mà không cần BE
 * setup. Banner "Demo" hiển thị rõ ràng ở dashboard.
 */
import type {
  BadgeItem,
  RatingItem,
  RatingSummary,
  VetMeProfile,
  WorkScheduleSlot,
} from './api';

const DEMO_KEY = 'petclinic.vet.demo';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_KEY) === '1';
}

export function enableDemoMode() {
  localStorage.setItem(DEMO_KEY, '1');
  window.location.reload();
}

export function disableDemoMode() {
  localStorage.removeItem(DEMO_KEY);
  window.location.reload();
}

// ─── Mock data ──────────────────────────────────────────────────────────────────

export const MOCK_PROFILE: VetMeProfile = {
  id: 999,
  firstName: 'Demo',
  lastName: 'Nguyễn',
  email: 'demo.vet@petclinic.local',
  phoneNumber: '0901 234 567',
  active: true,
  resume:
    'Bác sĩ thú y với 8 năm kinh nghiệm chăm sóc thú cưng nhỏ (chó, mèo). ' +
    'Chuyên sâu về phẫu thuật tiêu hoá và X-quang chẩn đoán. Tốt nghiệp ' +
    'Đại học Nông Lâm TP.HCM năm 2018, hoàn thành chương trình ' +
    'fellowship tại Bangkok Veterinary Hospital 2022.',
  specialties: [
    { id: 1, name: 'radiology' },
    { id: 2, name: 'surgery' },
  ],
};

export const MOCK_SCHEDULE: WorkScheduleSlot[] = [
  { workday: 'MONDAY', workHour: 'HOUR_8_9' },
  { workday: 'MONDAY', workHour: 'HOUR_9_10' },
  { workday: 'MONDAY', workHour: 'HOUR_10_11' },
  { workday: 'TUESDAY', workHour: 'HOUR_14_15' },
  { workday: 'TUESDAY', workHour: 'HOUR_15_16' },
  { workday: 'WEDNESDAY', workHour: 'HOUR_8_9' },
  { workday: 'WEDNESDAY', workHour: 'HOUR_9_10' },
  { workday: 'THURSDAY', workHour: 'HOUR_14_15' },
  { workday: 'FRIDAY', workHour: 'HOUR_8_9' },
  { workday: 'FRIDAY', workHour: 'HOUR_9_10' },
  { workday: 'FRIDAY', workHour: 'HOUR_10_11' },
  { workday: 'SATURDAY', workHour: 'HOUR_9_10' },
];

const RATING_DATA: { customerName: string; score: number; description?: string }[] = [
  {
    customerName: 'Trần Minh Hà',
    score: 5,
    description: 'Bác sĩ rất tận tâm với bé Milo. Tư vấn rõ ràng, theo dõi sau khám chu đáo.',
  },
  {
    customerName: 'Lê Văn Cường',
    score: 5,
    description: 'Phẫu thuật thành công cho mèo nhà mình. Cảm ơn bác sĩ!',
  },
  {
    customerName: 'Phạm Thu Phương',
    score: 4,
    description: 'Khám kỹ lưỡng, giải thích dễ hiểu. Chỉ tiếc phòng khám hơi đông.',
  },
  {
    customerName: 'Hoàng Quốc Bảo',
    score: 5,
    description: 'Bé Lucky đã khỏe hẳn sau 2 lần khám. Cảm ơn bác sĩ rất nhiều.',
  },
  {
    customerName: 'Nguyễn Thị Lan',
    score: 5,
    description: 'Chuyên môn cao, thái độ thân thiện với cả thú cưng lẫn chủ nuôi.',
  },
  {
    customerName: 'Vũ Đức Anh',
    score: 4,
    description: 'Chẩn đoán chính xác, giá cả hợp lý.',
  },
  {
    customerName: 'Đặng Mỹ Linh',
    score: 5,
    description: 'Lần thứ 3 đưa Bông đến rồi. Luôn yên tâm khi gặp bác sĩ.',
  },
  {
    customerName: 'Bùi Hoàng Long',
    score: 3,
    description: 'Khám ổn nhưng phải đợi hơi lâu.',
  },
  {
    customerName: 'Trịnh Quốc Tuấn',
    score: 5,
    description: 'Tay nghề phẫu thuật xuất sắc.',
  },
  {
    customerName: 'Lý Thanh Mai',
    score: 5,
  },
  {
    customerName: 'Phan Văn Hùng',
    score: 4,
    description: 'Tư vấn dinh dưỡng rất hữu ích.',
  },
  {
    customerName: 'Đoàn Kim Ngân',
    score: 5,
    description: 'Bác sĩ rất kiên nhẫn, không thúc giục.',
  },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_RATINGS: RatingItem[] = RATING_DATA.map((r, i) => ({
  id: 1000 + i,
  vetId: 999,
  ...r,
  rateDate: daysAgo(i * 3 + 1),
}));

export const MOCK_SUMMARY: RatingSummary = (() => {
  const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let sum = 0;
  for (const r of MOCK_RATINGS) {
    const score = r.score ?? 0;
    dist[score.toString()] = (dist[score.toString()] ?? 0) + 1;
    sum += score;
  }
  return {
    count: MOCK_RATINGS.length,
    average: sum / MOCK_RATINGS.length,
    distribution: dist,
  };
})();

export const MOCK_BADGES: BadgeItem[] = [
  {
    id: 1,
    vetId: 999,
    title: 'ROOKIE',
    awardedDate: daysAgo(720),
    description: 'Hoàn thành 10 ca khám đầu tiên — bước khởi đầu của hành trình.',
  },
  {
    id: 2,
    vetId: 999,
    title: 'EXPERIENCED',
    awardedDate: daysAgo(360),
    description: 'Vượt mốc 100 ca khám với điểm trung bình ≥ 4.5.',
  },
  {
    id: 3,
    vetId: 999,
    title: 'TOP_RATED',
    awardedDate: daysAgo(45),
    description: 'Lọt top 5 bác sĩ được khách đánh giá cao nhất quý này.',
  },
];

export function pageOf<T>(items: T[], page: number, size: number) {
  const start = page * size;
  const slice = items.slice(start, start + size);
  return {
    content: slice,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    number: page,
    size,
  };
}
