import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Medal,
  Star,
  UserCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { cn } from '@/lib/utils';

/**
 * Phase K3 — layout cho role VET. Guard: yêu cầu accessToken + role VET (hoặc
 * STAFF/ADMIN dùng /me cho debug). User không có claim {@code vetId} → service
 * /me sẽ trả 400 missing-vet-id → page hiển thị error state.
 */
export const Route = createFileRoute('/vet')({
  beforeLoad: ({ location }) => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    const roles = user?.roles ?? [];
    const allowed =
      roles.includes('VET') || roles.includes('STAFF') || roles.includes('ADMIN');
    if (!allowed) {
      // Customer/user thường → tự về trang chính.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/' });
    }
  },
  component: VetLayout,
});

interface NavItem {
  to: '/vet' | '/vet/profile' | '/vet/schedule' | '/vet/ratings' | '/vet/badges';
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { to: '/vet', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { to: '/vet/profile', label: 'Hồ sơ cá nhân', icon: UserCircle },
  { to: '/vet/schedule', label: 'Lịch trực', icon: CalendarDays },
  { to: '/vet/ratings', label: 'Đánh giá', icon: Star },
  { to: '/vet/badges', label: 'Huy hiệu', icon: Medal },
];

function VetLayout() {
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clear();
        window.location.href = '/login';
      },
    },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Link to="/vet" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
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
        <div className="border-t p-3">
          <div className="px-3 pb-2 text-xs text-muted-foreground">
            BS. {user?.username ?? 'Anonymous'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="size-4" />
            {logoutMutation.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
