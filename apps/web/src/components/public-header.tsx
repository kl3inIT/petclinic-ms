import { Link } from '@tanstack/react-router';
import { CalendarCheck, Menu, Phone, X } from 'lucide-react';
import { useState } from 'react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Trang chủ', href: '/#home' },
  { label: 'Dịch vụ', href: '/#services' },
  { label: 'Quy trình', href: '/#process' },
  { label: 'Bác sĩ', href: '/#team' },
  { label: 'Bảng giá', href: '/#pricing' },
  { label: 'Đánh giá', href: '/#testimonials' },
] as const;

export function getPortalHref(roles: string[] | undefined): string {
  if (!roles?.length) return '/login';
  if (roles.includes('ADMIN')) return '/admin';
  if (roles.includes('INVENTORY_MANAGER')) return '/inventory';
  if (roles.includes('STAFF')) return '/staff';
  if (roles.includes('VET')) return '/vet';
  if (roles.includes('USER')) return '/customer/book';
  return '/login';
}

interface PublicHeaderProps {
  position?: 'fixed' | 'sticky';
  activePage?: 'home' | 'store';
}

export function PublicHeader({
  position = 'fixed',
  activePage = 'home',
}: PublicHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const ctaHref = user ? getPortalHref(user.roles) : '/login';

  return (
    <header
      className={cn(
        'top-0 z-50 w-full border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur-xl',
        position,
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" aria-label="MSS301 Petclinic - Trang chủ">
          <Logo size="sm" />
        </Link>

        <nav
          aria-label="Điều hướng chính"
          className="hidden items-center gap-5 lg:flex xl:gap-7"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                'text-sm font-semibold transition-colors hover:text-violet-600 xl:text-[15px]',
                activePage === 'home' && item.href === '/#home'
                  ? 'text-violet-700'
                  : 'text-slate-600',
              )}
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/store"
            className={cn(
              'text-sm font-semibold transition-colors hover:text-violet-600 xl:text-[15px]',
              activePage === 'store' ? 'text-violet-700' : 'text-slate-600',
            )}
          >
            Cửa hàng
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="tel:18002424"
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-violet-200 hover:text-violet-700 md:flex"
          >
            <Phone className="size-4 text-violet-600" />
            1800 2424
          </a>
          <Button
            asChild
            className="hidden rounded-full bg-violet-600 px-5 font-bold shadow-lg shadow-violet-600/20 hover:bg-violet-700 sm:inline-flex"
          >
            <Link to={ctaHref}>
              {!user && <CalendarCheck className="mr-2 size-4" />}
              {user ? 'Trang của tôi' : 'Đặt lịch ngay'}
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full lg:hidden"
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          aria-label="Điều hướng di động"
          className="border-t border-slate-100 bg-white px-6 py-5 shadow-xl lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/store"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700"
              onClick={() => setIsMenuOpen(false)}
            >
              Cửa hàng
            </Link>
            <Button
              asChild
              className="mt-3 rounded-full bg-violet-600 font-bold sm:hidden"
            >
              <Link to={ctaHref}>{user ? 'Trang của tôi' : 'Đặt lịch ngay'}</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
