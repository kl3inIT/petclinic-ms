// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { CustomerVisitRow } from './CustomerVisitRow';

afterEach(cleanup);

const visit = {
  id: 42,
  petId: 3,
  petName: 'Milo',
  vetId: 7,
  status: VisitResponseStatus.COMPLETED,
  reason: 'Khám tổng quát',
  scheduledAt: '2026-07-20T09:00:00Z',
};

const callbacks = {
  onDetail: vi.fn(),
  onReschedule: vi.fn(),
  onCancel: vi.fn(),
  onRate: vi.fn(),
};

describe('CustomerVisitRow rating action', () => {
  it('shows a non-interactive rated state after a rating exists', () => {
    render(
      <CustomerVisitRow
        visit={visit}
        vetMap={new Map()}
        ratingState="rated"
        {...callbacks}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Đánh giá' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Đã đánh giá' })).toBeDisabled();
  });

  it('offers rating only after persistent eligibility is known', () => {
    render(
      <CustomerVisitRow
        visit={visit}
        vetMap={new Map()}
        ratingState="eligible"
        {...callbacks}
      />,
    );

    expect(screen.getByRole('button', { name: 'Đánh giá' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Đã đánh giá' })).toBeNull();
  });
});
