import { useQueries } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';
import type { RatingResponse } from '@/lib/api/generated/model/ratingResponse';
import { listVetRatings } from '@/lib/api/generated/vet-ratings/vet-ratings';

const RATING_PAGE_SIZE = 100;

export type CustomerRatingState = 'checking' | 'eligible' | 'rated' | 'unavailable';

export const getCustomerVetRatingQueryKey = (vetId: number, username: string) =>
  ['customer-vet-rating', vetId, username] as const;

/**
 * Finds the authenticated customer's persisted rating without assuming it is
 * present on the first ratings page. The public list is paginated, so walking
 * pages is required to keep the one-rating state correct as the clinic grows.
 */
export async function findCustomerVetRating(
  vetId: number,
  username: string,
  signal?: AbortSignal,
): Promise<RatingResponse | null> {
  let page = 0;

  while (true) {
    const response = await listVetRatings(
      vetId,
      {
        pageable: {
          page,
          size: RATING_PAGE_SIZE,
          sort: ['rateDate,desc'],
        },
      },
      signal,
    );
    const ownRating = response.content?.find(
      (rating) => rating.customerName === username,
    );
    if (ownRating) return ownRating;

    if (
      response.last === true ||
      response.content?.length === 0 ||
      page + 1 >= (response.totalPages ?? 0)
    ) {
      return null;
    }
    page += 1;
  }
}

export function useCustomerVetRatingStates(vetIds: number[]) {
  const username = useAuthStore((state) => state.user?.username);
  const uniqueVetIds = [...new Set(vetIds)];
  const queries = useQueries({
    queries: username
      ? uniqueVetIds.map((vetId) => ({
          queryKey: getCustomerVetRatingQueryKey(vetId, username),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            findCustomerVetRating(vetId, username, signal),
          staleTime: 60_000,
          retry: 1,
        }))
      : [],
  });

  const states = new Map<number, CustomerRatingState>();
  uniqueVetIds.forEach((vetId, index) => {
    const query = queries[index];
    if (!username || query?.isError) {
      states.set(vetId, 'unavailable');
    } else if (query?.isPending) {
      states.set(vetId, 'checking');
    } else {
      states.set(vetId, query?.data ? 'rated' : 'eligible');
    }
  });

  return states;
}
