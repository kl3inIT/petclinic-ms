import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/generated/vet-ratings/vet-ratings', () => ({
  listVetRatings: vi.fn(),
}));

import { listVetRatings } from '@/lib/api/generated/vet-ratings/vet-ratings';
import { findCustomerVetRating } from './customer-rating-state';

const listVetRatingsMock = vi.mocked(listVetRatings);

describe('findCustomerVetRating', () => {
  beforeEach(() => listVetRatingsMock.mockReset());

  it('walks all result pages until it finds the persisted customer rating', async () => {
    listVetRatingsMock
      .mockResolvedValueOnce({
        content: [{ id: 1, customerName: 'another-user', score: 3 }],
        totalPages: 2,
        last: false,
      })
      .mockResolvedValueOnce({
        content: [{ id: 2, customerName: 'customer1', score: 5 }],
        totalPages: 2,
        last: true,
      });

    await expect(findCustomerVetRating(7, 'customer1')).resolves.toMatchObject({
      id: 2,
      score: 5,
    });
    expect(listVetRatingsMock).toHaveBeenCalledTimes(2);
    expect(listVetRatingsMock.mock.calls[1]?.[0]).toBe(7);
    expect(listVetRatingsMock.mock.calls[1]?.[1].pageable.page).toBe(1);
  });

  it('returns null only after the final page has been checked', async () => {
    listVetRatingsMock.mockResolvedValue({
      content: [{ id: 1, customerName: 'another-user', score: 3 }],
      totalPages: 1,
      last: true,
    });

    await expect(findCustomerVetRating(7, 'customer1')).resolves.toBeNull();
  });
});
