// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/features/products/api', () => ({
  useProducts: () => ({
    data: {
      content: [
        ['MCH_TOY_BALL', 'Bóng nhai', 'Đồ chơi'],
        ['MCH_TOY_MOUSE', 'Chuột bông', 'Đồ chơi'],
        ['MCH_FOOD_DOG', 'Hạt cho chó', 'Thức ăn'],
        ['MCH_FOOD_CAT', 'Hạt cho mèo', 'Thức ăn'],
        ['MCH_LEASH', 'Dây dắt', 'Phụ kiện'],
        ['MCH_COLLAR', 'Vòng cổ', 'Phụ kiện'],
        ['MCH_SHAMPOO', 'Sữa tắm', 'Chăm sóc'],
        ['MCH_DOG_RAINCOAT_M', 'Áo mưa', 'Phụ kiện'],
        ['MCH_TREAT_CAT', 'Bánh thưởng mèo', 'Bánh thưởng'],
        ['MCH_TREAT_DOG', 'Bánh thưởng chó', 'Bánh thưởng'],
        ['MCH_BOWL_STEEL', 'Bát inox', 'Phụ kiện'],
        ['MCH_LITTER', 'Cát vệ sinh', 'Vệ sinh thú cưng'],
        ['MCH_CAT_GRASS', 'Cỏ mèo', 'Chăm sóc mèo'],
        ['MCH_HARNESS_M', 'Đai yếm', 'Phụ kiện'],
        ['MCH_DENTAL_CHEW', 'Thanh nhai', 'Nha khoa'],
        ['MCH_TOOTHPASTE', 'Kem đánh răng', 'Nha khoa'],
        ['MCH_CARRIER_S', 'Lồng vận chuyển', 'Phụ kiện'],
        ['MCH_BRUSH', 'Lược chải lông', 'Dụng cụ grooming'],
        ['MCH_PEE_PAD', 'Tấm lót vệ sinh', 'Vệ sinh thú cưng'],
      ].map(([code, name, category], index) => ({
        id: index + 1,
        code,
        name,
        category,
        unitPrice: 100_000,
        unit: 'cái',
        stockQuantity: 12,
        stockStatus: 'IN_STOCK',
      })),
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { StorePage } from './StorePage';

describe('StorePage', () => {
  it('presents products as in-store-only without cart or online fulfillment actions', async () => {
    render(<StorePage />);

    expect(await screen.findByText('Chỉ bán trực tiếp tại cửa hàng')).not.toBeNull();
    expect(screen.getAllByText('Tại quầy')).toHaveLength(19);
    expect(screen.queryByText(/Giỏ hàng/i)).toBeNull();
    expect(screen.queryByText(/Giao nhanh/i)).toBeNull();
    expect(screen.queryByText(/thanh toán trực tuyến/i)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Nha khoa' })).not.toBeNull();

    const productNames = [
      'Bóng nhai',
      'Chuột bông',
      'Hạt cho chó',
      'Hạt cho mèo',
      'Dây dắt',
      'Vòng cổ',
      'Sữa tắm',
      'Áo mưa',
      'Bánh thưởng mèo',
      'Bánh thưởng chó',
      'Bát inox',
      'Cát vệ sinh',
      'Cỏ mèo',
      'Đai yếm',
      'Thanh nhai',
      'Kem đánh răng',
      'Lồng vận chuyển',
      'Lược chải lông',
      'Tấm lót vệ sinh',
    ];
    const productSources = productNames.map((name) =>
      screen.getByRole('img', { name }).getAttribute('src'),
    );

    expect(new Set(productSources).size).toBe(productNames.length);

    const productImage = screen.getByRole('img', { name: 'Hạt cho chó' });
    expect(productImage.getAttribute('src')).toBe('/images/store/mch-food-dog.jpg');

    fireEvent.error(productImage);
    expect(productImage.getAttribute('src')).toBe('/images/store/product-fallback.jpg');
  });
});
