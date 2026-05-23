import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  Home,
  LogOut,
  PawPrint,
  Plus,
  Stethoscope,
} from 'lucide-react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/customer')({
  beforeLoad: ({ location }) => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: CustomerLayout,
});

interface NavItem {
  to: '/customer' | '/customer/book' | '/customer/visits' | '/customer/pets';
  label: string;
  icon: typeof Home;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { to: '/customer', label: 'Tổng quan', icon: Home, exact: true },
  { to: '/customer/book', label: 'Đặt lịch khám', icon: CalendarCheck },
  { to: '/customer/visits', label: 'Lịch sử khám', icon: Stethoscope },
  { to: '/customer/pets', label: 'Thú cưng của tôi', icon: PawPrint },
];

function CustomerLayout() {
  const user = useAuthStore((s) => s.user);
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-all hover:bg-violet-50 hover:text-violet-700',
                )}
                activeProps={{
                  className: 'bg-violet-100 text-violet-700 shadow-sm',
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              size="sm"
              className="hidden rounded-lg bg-violet-600 px-4 font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 md:inline-flex"
            >
              <Link to="/customer/book">
                <Plus className="size-4" /> Đặt lịch khám mới
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

            <div className="hidden items-center gap-3 md:flex">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80&auto=format&fit=crop"
                alt=""
                className="size-10 rounded-full border border-slate-100 object-cover shadow-sm"
              />
              <div className="hidden flex-col text-right xl:flex">
                <span className="text-sm font-bold text-slate-800">
                  {user?.username ?? 'customer@petclinic.local'}
                </span>
                <span className="text-xs font-medium text-slate-500">Khách hàng</span>
              </div>
              <ChevronDown className="size-4 text-slate-500" />
            </div>

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

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-violet-50 hover:text-violet-700"
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
