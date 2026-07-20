import { describe, expect, it } from 'vitest';

import type { ProductResponse } from '@/features/products/api';
import { summarizeInventory } from '@/features/products/inventory-metrics';

describe('summarizeInventory', () => {
  it('counts active stock states and values only stock-tracked active items', () => {
    const products = [
      product({ id: 1, stockQuantity: 3, unitPrice: 10, stockStatus: 'LOW' }),
      product({ id: 2, stockQuantity: 0, unitPrice: 20, stockStatus: 'OUT' }),
      product({ id: 3, stockTracked: false, stockQuantity: undefined, unitPrice: 100 }),
      product({ id: 4, active: false, stockQuantity: 50, unitPrice: 100 }),
    ];

    expect(summarizeInventory(products)).toEqual({
      activeCatalogItems: 3,
      stockTrackedItems: 2,
      lowStockItems: 1,
      outOfStockItems: 1,
      inventoryValue: 30,
    });
  });
});

function product(overrides: Partial<ProductResponse>): ProductResponse {
  return {
    id: 1,
    code: 'MED_TEST',
    name: 'Test',
    type: 'MEDICATION',
    unitPrice: 0,
    stockQuantity: 0,
    reorderLevel: 0,
    stockTracked: true,
    stockStatus: 'AVAILABLE',
    active: true,
    ...overrides,
  };
}
