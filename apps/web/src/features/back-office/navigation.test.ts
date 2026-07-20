import { describe, expect, it } from 'vitest';

import { STAFF_NAV_ITEMS } from './navigation';

describe('back-office navigation', () => {
  it('limits staff navigation to reception and cashier responsibilities', () => {
    expect(STAFF_NAV_ITEMS.map((item) => item.to)).toEqual([
      '/staff',
      '/staff/visits',
      '/staff/owners',
      '/staff/pets',
      '/staff/invoices',
    ]);
  });

  it('does not expose administration or clinical menus to staff', () => {
    const paths = STAFF_NAV_ITEMS.map((item) => item.to).join(' ');

    expect(paths).not.toMatch(/vets|reviews|products|workflows|llm|diseases/);
  });
});
