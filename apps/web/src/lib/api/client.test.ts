// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { apiClient } from './client';

describe('apiClient query serialization', () => {
  it('uses repeated keys for Spring pageable array parameters', () => {
    const uri = apiClient.getUri({
      url: '/api/v1/products/stock/movements',
      params: {
        page: 0,
        size: 50,
        sort: ['createdDate,desc', 'id,desc'],
      },
    });

    expect(uri).toBe(
      '/api/v1/products/stock/movements?page=0&size=50&sort=createdDate%2Cdesc&sort=id%2Cdesc',
    );
    expect(uri).not.toContain('sort%5B%5D');
  });

  it('flattens generated Pageable objects for Spring MVC', () => {
    const uri = apiClient.getUri({
      url: '/api/v1/visits',
      params: {
        status: 'COMPLETED',
        pageable: {
          page: 2,
          size: 50,
          sort: ['scheduledAt,desc', 'id,desc'],
        },
      },
    });

    expect(uri).toBe(
      '/api/v1/visits?status=COMPLETED&page=2&size=50&sort=scheduledAt%2Cdesc&sort=id%2Cdesc',
    );
    expect(uri).not.toContain('pageable');
  });
});
