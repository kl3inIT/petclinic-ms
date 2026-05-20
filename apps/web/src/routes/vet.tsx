import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import {
  Award,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  Stethoscope,
  UserCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuthStore } from '@/features/auth/store';
import { DemoBanner } from '@/features/vet-me/components/DemoBanner';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { cn } from '@/lib/utils';

/**
 * Phase K3 — layout cho role VET. Guard: yêu cầu accessToken + role VET (hoặc
 * STAFF/ADMIN dùng /me cho debug). User không có claim {@code vetId} → service
 * /me sẽ trả 400 missing-vet-id → page hiển thị error state.
 */
// Role gate: VET là role mặc định. ADMIN/STAFF cho debug (admin link sang vet entity).
// CUSTOMER không có quyền vào portal — redirect về /customer.
// CodeRabbit review (PR #11, 2026-05-20) flag việc cho mọi user login vào portal
// gây nhầm UX. Demo mode tách riêng: bật qua URL ?demo=1 trên /login hoặc /.
const VET_PORTAL_ROLES = ['VET', 'ADMIN', 'STAFF'] as const;

export const Route = createFileRoute('/vet')({
  beforeLoad: ({ location }) => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    const hasAccess = user?.roles?.some((r) => VET_PORTAL_ROLES.includes(r as never));
    if (!hasAccess) {
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
  { to: '/vet/ratings', label: 'Đánh giá', icon: MessageSquareQuote },
  { to: '/vet/badges', label: 'Huy hiệu', icon: Award },
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
    <div className="flex min-h-screen flex-col bg-muted/10 md:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Link to="/vet" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-xs font-semibold text-primary">Vet portal</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="size-4" />
        </Button>
      </header>

      {/* Mobile horizontal nav */}
      <nav className="flex overflow-x-auto border-b bg-card px-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            className="shrink-0 px-3 py-3 text-xs text-muted-foreground"
            activeProps={{
              className:
                'border-b-2 border-primary text-primary font-medium',
            }}
          >
            <div className="flex items-center gap-1.5">
              <item.icon className="size-3.5" />
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Link to="/vet" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Vet portal
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              )}
              activeProps={{
                className:
                  'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary',
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-1 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              <Stethoscope className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {user?.username ?? 'Anonymous'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Bác sĩ thú y
              </div>
            </div>
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

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <DemoBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
