import { Link, Outlet, createFileRoute } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  PawPrint,
  Stethoscope,
  CalendarCheck,
  Workflow,
  LogOut,
  Sparkles,
  ShieldCheck,
  Receipt,
  Pill,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuthStore } from '@/features/auth/store';
import { requireAnyRole } from '@/features/auth/guards';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { ChatWidget } from '@/features/ai/components/ChatWidget';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    // /admin/** cho ADMIN + STAFF (STAFF có quyền duyệt thay đổi vet).
    // Trang nào chỉ ADMIN (vd /admin/llm-config) tự render conditionally qua isAdmin.
    requireAnyRole({ redirectFrom: location.href, allowedRoles: ['ADMIN', 'STAFF'] });
  },
  component: AdminLayout,
});

interface NavItem {
  to:
    | '/admin'
    | '/admin/owners'
    | '/admin/pets'
    | '/admin/vets'
    | '/admin/vet-reviews'
    | '/admin/visits'
    | '/admin/workflows'
    | '/admin/invoices'
    | '/admin/diseases'
    | '/admin/products'
    | '/admin/llm-config';
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/visits', label: 'Visits', icon: CalendarCheck },
  { to: '/admin/workflows', label: 'Workflows', icon: Workflow, adminOnly: true },
  { to: '/admin/owners', label: 'Owners', icon: Users },
  { to: '/admin/pets', label: 'Pets', icon: PawPrint },
  { to: '/admin/vets', label: 'Vets', icon: Stethoscope },
  { to: '/admin/invoices', label: 'Hoá đơn', icon: Receipt },
  { to: '/admin/diseases', label: 'Danh mục bệnh', icon: Pill, adminOnly: true },
  { to: '/admin/products', label: 'Danh mục sản phẩm', icon: Package, adminOnly: true },
  { to: '/admin/vet-reviews', label: 'Duyệt thay đổi', icon: ShieldCheck },
  { to: '/admin/llm-config', label: 'AI Config', icon: Sparkles, adminOnly: true },
];

function AdminLayout() {
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes('ADMIN') ?? false;
  // Logout BE để revoke refresh token; clear local store rồi redirect dù BE fail.
  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clear();
        window.location.href = '/login';
      },
    },
  });

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map((item) => (
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
            {user?.username ?? 'Anonymous'}
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
      {/* Floating AI chat widget — chỉ render khi đã login (check trong widget). */}
      <ChatWidget />
    </div>
  );
}
