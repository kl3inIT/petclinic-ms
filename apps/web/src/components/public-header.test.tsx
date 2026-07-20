// @vitest-environment jsdom

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) =>
    selector({ user: null }),
}));

import { getPortalHref, PublicHeader } from './public-header';

describe('PublicHeader', () => {
  it('provides the complete public navigation on every public page', () => {
    render(<PublicHeader position="sticky" activePage="store" />);

    expect(
      screen.getByRole('link', { name: /MSS301 Petclinic - Trang chủ/i }),
    ).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Dịch vụ' }).getAttribute('href')).toBe(
      '/#services',
    );
    expect(screen.getByRole('link', { name: 'Cửa hàng' }).getAttribute('href')).toBe(
      '/store',
    );
    expect(screen.getByRole('link', { name: /1800 2424/ }).getAttribute('href')).toBe(
      'tel:18002424',
    );
  });

  it('opens an accessible mobile menu', () => {
    render(<PublicHeader />);

    const trigger = screen.getByRole('button', { name: 'Mở menu' });
    fireEvent.click(trigger);

    expect(screen.getByRole('navigation', { name: 'Điều hướng di động' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Đóng menu' })).not.toBeNull();
  });
});

describe('getPortalHref', () => {
  it('routes each public user to the correct portal', () => {
    expect(getPortalHref(undefined)).toBe('/login');
    expect(getPortalHref(['USER'])).toBe('/customer/book');
    expect(getPortalHref(['VET'])).toBe('/vet');
    expect(getPortalHref(['STAFF'])).toBe('/staff');
    expect(getPortalHref(['INVENTORY_MANAGER'])).toBe('/inventory');
    expect(getPortalHref(['ADMIN'])).toBe('/admin');
    expect(getPortalHref(['ADMIN', 'USER'])).toBe('/admin');
  });
});
