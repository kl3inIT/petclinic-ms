import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import {
  Award,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  Settings,
  Stethoscope,
  UserCircle,
} from 'lucide-react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { requireAnyRole } from '@/features/auth/guards';
import { DemoBanner } from '@/features/vet-me/components/DemoBanner';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { cn } from '@/lib/utils';

const VET_PORTAL_ROLES = ['VET', 'STAFF'] as const;

export const Route = createFileRoute('/vet')({
  beforeLoad: ({ location }) => {
    // /vet/** chỉ cho VET + STAFF (+ ADMIN bypass). USER role không vào được —
    // sẽ redirect /forbidden với explain context.
    requireAnyRole({ redirectFrom: location.href, allowedRoles: VET_PORTAL_ROLES });
  },
  component: VetLayout,
});

interface NavItem {
  to:
    | '/vet'
    | '/vet/visits'
    | '/vet/profile'
    | '/vet/schedule'
    | '/vet/ratings'
    | '/vet/badges'
    | '/vet/settings';
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { to: '/vet', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { to: '/vet/visits', label: 'Ca khám', icon: ClipboardList },
  { to: '/vet/profile', label: 'Hồ sơ cá nhân', icon: UserCircle },
  { to: '/vet/schedule', label: 'Lịch trực', icon: CalendarDays },
  { to: '/vet/ratings', label: 'Đánh giá', icon: MessageSquareQuote },
  { to: '/vet/badges', label: 'Huy hiệu', icon: Award },
  { to: '/vet/settings', label: 'Cài đặt', icon: Settings },
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
    <div className="flex min-h-screen flex-col bg-[#fbfaff] md:h-screen md:flex-row md:overflow-hidden">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 md:hidden">
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

      <nav className="flex shrink-0 overflow-x-auto border-b bg-white px-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            className="shrink-0 px-3 py-3 text-xs text-muted-foreground"
            activeProps={{
              className: 'border-b-2 border-primary text-primary font-medium',
            }}
          >
            <div className="flex items-center gap-1.5">
              <item.icon className="size-3.5" />
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Link to="/vet" className="flex min-w-0 flex-1 items-center gap-2">
            <Logo size="sm" />
          </Link>
          <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] leading-none font-semibold tracking-wide text-primary uppercase">
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
              <div className="text-[10px] tracking-wider text-muted-foreground uppercase">
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
            {logoutMutation.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto bg-[#fbfaff] p-4 sm:p-6 lg:p-8">
        <div className="min-h-full w-full">
          <DemoBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
