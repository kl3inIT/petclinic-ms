import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  MOCK_BADGES,
  MOCK_PROFILE,
  MOCK_RATINGS,
  MOCK_SCHEDULE,
  MOCK_SUMMARY,
  isDemoMode,
  pageOf,
} from './mock';

/**
 * Phase K3 — manual hooks cho endpoint /api/v1/vets/me/* (vets-service Phase K2).
 *
 * Orval chưa generate hook cho các endpoint này (cần `pnpm fetch:openapi &&
 * pnpm generate:api` + gateway chạy). Tạm thời wrap apiClient + TanStack Query
 * trong file này — interface tương đương useGetVet etc. Dev sau khi regen có
 * thể thay bằng hook generated, signature gần như giống.
 */

// ─── Types (match BE DTO Phase A-F.1) ───────────────────────────────────────────
export interface SpecialtyRef {
  id?: number;
  name?: string;
}

export interface VetMeProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  active: boolean;
  resume?: string;
  specialties?: SpecialtyRef[];
}

export interface UpdateVetMePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  active?: boolean;
  resume?: string;
}

export interface WorkScheduleSlot {
  workday: string;
  workHour: string;
}

export interface RatingItem {
  id: number;
  vetId: number;
  score: number;
  description?: string;
  customerName: string;
  rateDate: string;
}

export interface RatingSummary {
  count: number;
  average: number | null;
  distribution: Record<string, number>;
}

export interface BadgeItem {
  id: number;
  vetId: number;
  title: string;
  awardedDate: string;
  description?: string;
}

export interface PageEnvelope<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ─── Query keys ─────────────────────────────────────────────────────────────────
export const VET_ME_KEYS = {
  profile: ['/api/v1/vets/me'] as const,
  schedule: ['/api/v1/vets/me/work-schedule'] as const,
  ratings: (page: number) => ['/api/v1/vets/me/ratings', page] as const,
  summary: ['/api/v1/vets/me/ratings/summary'] as const,
  badges: (page: number) => ['/api/v1/vets/me/badges', page] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────────
// Mỗi hook check isDemoMode() trong queryFn — bật demo → resolve mock thay vì
// gọi API. Pattern này giữ shape `useQuery` consistent, không cần fake result object.

export function useMyProfile() {
  return useQuery({
    queryKey: VET_ME_KEYS.profile,
    queryFn: async () => {
      if (isDemoMode()) return MOCK_PROFILE;
      const { data } = await apiClient.get<VetMeProfile>('/api/v1/vets/me');
      return data;
    },
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateVetMePayload) => {
      if (isDemoMode()) {
        // Demo mode: không gọi API, merge mock + payload trả về luôn.
        const current = qc.getQueryData<VetMeProfile>(VET_ME_KEYS.profile);
        return {
          ...(current ?? MOCK_PROFILE),
          ...payload,
          phoneNumber: payload.phoneNumber ?? current?.phoneNumber,
          resume: payload.resume ?? current?.resume,
        } as VetMeProfile;
      }
      const { data } = await apiClient.patch<VetMeProfile>(
        '/api/v1/vets/me',
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(VET_ME_KEYS.profile, data);
    },
  });
}

export function useMySchedule() {
  return useQuery({
    queryKey: VET_ME_KEYS.schedule,
    queryFn: async () => {
      if (isDemoMode()) return MOCK_SCHEDULE;
      const { data } = await apiClient.get<WorkScheduleSlot[]>(
        '/api/v1/vets/me/work-schedule',
      );
      return data;
    },
  });
}

export function useMyRatings(page: number, size = 10) {
  return useQuery({
    queryKey: VET_ME_KEYS.ratings(page),
    queryFn: async () => {
      if (isDemoMode()) return pageOf(MOCK_RATINGS, page, size);
      const { data } = await apiClient.get<PageEnvelope<RatingItem>>(
        '/api/v1/vets/me/ratings',
        { params: { page, size, sort: 'rateDate,desc' } },
      );
      return data;
    },
  });
}

export function useMyRatingsSummary() {
  return useQuery({
    queryKey: VET_ME_KEYS.summary,
    queryFn: async () => {
      if (isDemoMode()) return MOCK_SUMMARY;
      const { data } = await apiClient.get<RatingSummary>(
        '/api/v1/vets/me/ratings/summary',
      );
      return data;
    },
  });
}

export function useMyBadges(page: number, size = 12) {
  return useQuery({
    queryKey: VET_ME_KEYS.badges(page),
    queryFn: async () => {
      if (isDemoMode()) return pageOf(MOCK_BADGES, page, size);
      const { data } = await apiClient.get<PageEnvelope<BadgeItem>>(
        '/api/v1/vets/me/badges',
        { params: { page, size, sort: 'awardedDate,desc' } },
      );
      return data;
    },
  });
}

/** Top N rating mới nhất — dùng cho widget dashboard. */
export function useMyRecentRatings(limit = 5) {
  return useQuery({
    queryKey: ['/api/v1/vets/me/ratings/recent', limit] as const,
    queryFn: async () => {
      if (isDemoMode()) return MOCK_RATINGS.slice(0, limit);
      const { data } = await apiClient.get<PageEnvelope<RatingItem>>(
        '/api/v1/vets/me/ratings',
        { params: { page: 0, size: limit, sort: 'rateDate,desc' } },
      );
      return data.content;
    },
  });
}
