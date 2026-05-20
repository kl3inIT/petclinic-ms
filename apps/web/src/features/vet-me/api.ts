import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

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
export function useMyProfile() {
  return useQuery({
    queryKey: VET_ME_KEYS.profile,
    queryFn: () =>
      apiClient.get<VetMeProfile>('/api/v1/vets/me').then((r) => r.data),
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVetMePayload) =>
      apiClient
        .patch<VetMeProfile>('/api/v1/vets/me', payload)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(VET_ME_KEYS.profile, data);
    },
  });
}

export function useMySchedule() {
  return useQuery({
    queryKey: VET_ME_KEYS.schedule,
    queryFn: () =>
      apiClient
        .get<WorkScheduleSlot[]>('/api/v1/vets/me/work-schedule')
        .then((r) => r.data),
  });
}

export function useMyRatings(page: number, size = 10) {
  return useQuery({
    queryKey: VET_ME_KEYS.ratings(page),
    queryFn: () =>
      apiClient
        .get<PageEnvelope<RatingItem>>('/api/v1/vets/me/ratings', {
          params: { page, size, sort: 'rateDate,desc' },
        })
        .then((r) => r.data),
  });
}

export function useMyRatingsSummary() {
  return useQuery({
    queryKey: VET_ME_KEYS.summary,
    queryFn: () =>
      apiClient
        .get<RatingSummary>('/api/v1/vets/me/ratings/summary')
        .then((r) => r.data),
  });
}

export function useMyBadges(page: number, size = 12) {
  return useQuery({
    queryKey: VET_ME_KEYS.badges(page),
    queryFn: () =>
      apiClient
        .get<PageEnvelope<BadgeItem>>('/api/v1/vets/me/badges', {
          params: { page, size, sort: 'awardedDate,desc' },
        })
        .then((r) => r.data),
  });
}
