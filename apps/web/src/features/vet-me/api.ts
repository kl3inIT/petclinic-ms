import { useQueryClient } from '@tanstack/react-query';

import {
  getGetMyVetProfileQueryKey,
  useGetMyRatingsSummary,
  useGetMyVetProfile,
  useListMyBadges,
  useListMyRatings,
  useListMyWorkSchedule,
  useUpdateMyVetProfile as useGeneratedUpdateMyVetProfile,
} from '@/lib/api/generated/vet-me-self-service/vet-me-self-service';
import type {
  BadgeResponse,
  PageBadgeResponse,
  PageRatingResponse,
  RatingResponse,
  RatingSummaryResponse,
  UpdateVetRequest,
  VetResponse,
  WorkScheduleSlotResponse,
} from '@/lib/api/generated/model';
import {
  MOCK_BADGES,
  MOCK_PROFILE,
  MOCK_RATINGS,
  MOCK_SCHEDULE,
  MOCK_SUMMARY,
  isDemoMode,
  pageOf,
} from './mock';

export type SpecialtyRef = NonNullable<VetResponse['specialties']>[number];
export type VetMeProfile = VetResponse;
export type UpdateVetMePayload = UpdateVetRequest;
export type WorkScheduleSlot = WorkScheduleSlotResponse;
export type RatingItem = RatingResponse;
export type RatingSummary = RatingSummaryResponse;
export type BadgeItem = BadgeResponse;

export function useMyProfile() {
  const demo = isDemoMode();
  return useGetMyVetProfile({
    query: {
      enabled: !demo,
      initialData: demo ? MOCK_PROFILE : undefined,
    },
  });
}

export function useUpdateMyProfile() {
  const demo = isDemoMode();
  const qc = useQueryClient();

  return useGeneratedUpdateMyVetProfile({
    mutation: {
      ...(demo
        ? {
            mutationFn: ({ data }: { data: UpdateVetMePayload }) => {
              const current =
                qc.getQueryData<VetMeProfile>(getGetMyVetProfileQueryKey()) ??
                MOCK_PROFILE;
              return Promise.resolve({
                ...current,
                ...data,
                phoneNumber: data.phoneNumber ?? current.phoneNumber,
                resume: data.resume ?? current.resume,
              });
            },
          }
        : {}),
      onSuccess: (data) => {
        qc.setQueryData(getGetMyVetProfileQueryKey(), data);
        void qc.invalidateQueries({ queryKey: getGetMyVetProfileQueryKey() });
      },
    },
  });
}

export function useMySchedule() {
  const demo = isDemoMode();
  return useListMyWorkSchedule({
    query: {
      enabled: !demo,
      initialData: demo ? MOCK_SCHEDULE : undefined,
    },
  });
}

export function useMyRatings(page: number, size = 10) {
  const demo = isDemoMode();
  return useListMyRatings(
    { pageable: { page, size, sort: ['rateDate,desc'] } },
    {
      query: {
        enabled: !demo,
        initialData: demo
          ? (pageOf(MOCK_RATINGS, page, size) as PageRatingResponse)
          : undefined,
      },
    },
  );
}

export function useMyRatingsSummary() {
  const demo = isDemoMode();
  return useGetMyRatingsSummary({
    query: {
      enabled: !demo,
      initialData: demo ? MOCK_SUMMARY : undefined,
    },
  });
}

export function useMyBadges(page: number, size = 12) {
  const demo = isDemoMode();
  return useListMyBadges(
    { pageable: { page, size, sort: ['awardedDate,desc'] } },
    {
      query: {
        enabled: !demo,
        initialData: demo
          ? (pageOf(MOCK_BADGES, page, size) as PageBadgeResponse)
          : undefined,
      },
    },
  );
}

export function useMyRecentRatings(limit = 5) {
  const demo = isDemoMode();
  return useListMyRatings(
    { pageable: { page: 0, size: limit, sort: ['rateDate,desc'] } },
    {
      query: {
        enabled: !demo,
        initialData: demo
          ? (pageOf(MOCK_RATINGS, 0, limit) as PageRatingResponse)
          : undefined,
        select: (data): RatingResponse[] => data.content ?? [],
      },
    },
  );
}
