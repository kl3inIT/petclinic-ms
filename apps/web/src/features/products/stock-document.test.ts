import { describe, expect, it } from 'vitest';

import { stockDocumentFormSchema } from '@/features/products/schemas';

describe('stockDocumentFormSchema', () => {
  it('accepts a document with multiple product lines', () => {
    const result = stockDocumentFormSchema.safeParse({
      reference: 'PN-2026-001',
      reason: 'Nhập từ nhà cung cấp',
      items: [
        { productId: 1, quantity: 10 },
        { productId: 2, quantity: 5 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects duplicate products so each document line is unambiguous', () => {
    const result = stockDocumentFormSchema.safeParse({
      reference: 'PN-2026-001',
      reason: 'Nhập từ nhà cung cấp',
      items: [
        { productId: 1, quantity: 10 },
        { productId: 1, quantity: 5 },
      ],
    });

    expect(result.success).toBe(false);
  });
});
