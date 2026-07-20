import type { ReactNode } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/features/ai/components/ChatWidget';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/lib/api/generated/authentication/authentication';

interface PortalShellProps {
  home: '/admin' | '/staff' | '/inventory';
  portalLabel: string;
  navigation: ReactNode;
}

export function PortalShell({ home, portalLabel, navigation }: PortalShellProps) {
  const clear = useAuthStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clear();
        window.location.href = '/login';
      },
    },
  });

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-20 items-center border-b border-slate-100 px-5">
          <Link to={home} className="space-y-1">
            <Logo size="sm" />
            <span className="block pl-1 text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase">
              {portalLabel}
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">{navigation}</nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="truncate text-sm font-bold text-slate-800">
              {user?.username ?? 'Anonymous'}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {user?.roles.join(' · ') || 'Chưa xác định vai trò'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-600"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="size-4" />
            {logoutMutation.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <Outlet />
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
