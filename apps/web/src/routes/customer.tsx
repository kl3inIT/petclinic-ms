import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import {
  CalendarCheck,
  Home,
  LogOut,
  PawPrint,
  Plus,
  Stethoscope,
  UserCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
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
  to: '/customer' | '/customer/book' | '/customer/visits' | '/customer/pets' | '/customer/profile';
  label: string;
  icon: typeof Home;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { to: '/customer', label: 'Tổng quan', icon: Home, exact: true },
  { to: '/customer/book', label: 'Đặt lịch khám', icon: CalendarCheck },
  { to: '/customer/visits', label: 'Lịch sử khám', icon: Stethoscope },
  { to: '/customer/pets', label: 'Thú cưng của tôi', icon: PawPrint },
  { to: '/customer/profile', label: 'Hồ sơ', icon: UserCircle2 },
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
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                )}
                activeProps={{
                  className: 'bg-accent text-accent-foreground font-medium',
                }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link to="/customer/book">
                <Plus className="size-4" /> Đặt lịch
              </Link>
            </Button>
            <div className="hidden flex-col text-right md:flex">
              <span className="text-sm font-medium">{user?.username ?? 'Khách'}</span>
              <span className="text-xs text-muted-foreground">Khách hàng</span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              title="Đăng xuất"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t bg-white px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              activeProps={{
                className: 'bg-accent text-accent-foreground font-medium',
              }}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
