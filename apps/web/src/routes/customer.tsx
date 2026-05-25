import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import {
  Bell,
  CalendarCheck,
  Home,
  LogOut,
  PawPrint,
  Plus,
  Stethoscope,
  UserCircle2,
} from 'lucide-react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { requireAnyRole } from '@/features/auth/guards';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/customer')({
  beforeLoad: ({ location }) => {
    // /customer/** chỉ cho USER role (+ ADMIN bypass theo convention).
    // VET role không vào được — sẽ redirect /forbidden.
    requireAnyRole({ redirectFrom: location.href, allowedRoles: ['USER'] });
  },
  component: CustomerLayout,
});

interface NavItem {
  to:
    | '/customer'
    | '/customer/book'
    | '/customer/visits'
    | '/customer/pets'
    | '/customer/profile';
  label: string;
  icon: typeof Home;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { to: '/customer', label: 'Tổng quan', icon: Home, exact: true },
  { to: '/customer/book', label: 'Đặt lịch', icon: CalendarCheck },
  { to: '/customer/visits', label: 'Lịch sử', icon: Stethoscope },
  { to: '/customer/pets', label: 'Thú cưng', icon: PawPrint },
  { to: '/customer/profile', label: 'Hồ sơ', icon: UserCircle2 },
];

function CustomerLayout() {
  const clear = useAuthStore((s) => s.clear);
  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clear();
        window.location.href = '/';
      },
    },
  });

  return (
    <div className="min-h-screen bg-[#F8F8FF]">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-100 bg-slate-50/80 p-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap text-slate-500 transition-all hover:bg-white hover:text-violet-700',
                )}
                activeProps={{
                  className: 'bg-white text-violet-700 shadow-sm shadow-violet-100',
                }}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              size="sm"
              className="hidden rounded-lg bg-violet-600 px-4 font-bold shadow-sm shadow-violet-200 hover:bg-violet-700 md:inline-flex"
            >
              <Link to="/customer/book">
                <Plus className="size-4" />
                Đặt lịch khám mới
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="relative hidden rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700 md:inline-flex"
              title="Thông báo"
            >
              <Bell className="size-5" />
              <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>

            <Link
              to="/customer/profile"
              title="Hồ sơ của tôi"
              className="hidden size-10 shrink-0 overflow-hidden rounded-full border border-slate-100 bg-white shadow-sm transition hover:border-violet-100 hover:ring-2 hover:ring-violet-100 md:inline-flex"
            >
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80&auto=format&fit=crop"
                alt="Avatar"
                className="size-full object-cover"
              />
            </Link>

            <Button
              variant="ghost"
              size="icon-sm"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              title="Đăng xuất"
              className="rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        <nav className="flex [scrollbar-width:none] items-center gap-1 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 lg:hidden [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold whitespace-nowrap text-slate-500 hover:bg-violet-50 hover:text-violet-700"
              activeProps={{
                className: 'bg-violet-100 text-violet-700',
              }}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
