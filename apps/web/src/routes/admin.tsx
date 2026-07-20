import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import {
  CalendarCheck,
  Camera,
  LayoutDashboard,
  PawPrint,
  Pill,
  Receipt,
  Sparkles,
  Stethoscope,
  Users,
  Workflow,
} from 'lucide-react';

import { PortalShell } from '@/features/back-office/components/PortalShell';
import { requireAnyRole } from '@/features/auth/guards';
import { useAuthStore } from '@/features/auth/store';

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    requireAnyRole({
      redirectFrom: location.href,
      allowedRoles: ['ADMIN', 'INVENTORY_MANAGER'],
    });

    const roles = useAuthStore.getState().user?.roles ?? [];
    if (!roles.includes('ADMIN')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/inventory' });
    }
  },
  component: AdminLayout,
});

type AdminPath =
  | '/admin'
  | '/admin/owners'
  | '/admin/pets'
  | '/admin/vets'
  | '/admin/vet-reviews'
  | '/admin/visits'
  | '/admin/workflows'
  | '/admin/invoices'
  | '/admin/diseases'
  | '/admin/llm-config';

interface NavItem {
  to: AdminPath;
  label: string;
  icon: typeof LayoutDashboard;
}

const operationsNav: NavItem[] = [
  { to: '/admin/visits', label: 'Lịch khám', icon: CalendarCheck },
  { to: '/admin/owners', label: 'Chủ nuôi', icon: Users },
  { to: '/admin/pets', label: 'Thú cưng', icon: PawPrint },
  { to: '/admin/invoices', label: 'Hoá đơn', icon: Receipt },
];

const clinicalAdminNav: NavItem[] = [
  { to: '/admin/vets', label: 'Bác sĩ', icon: Stethoscope },
  { to: '/admin/diseases', label: 'Danh mục bệnh', icon: Pill },
  { to: '/admin/vet-reviews', label: 'Duyệt ảnh bác sĩ', icon: Camera },
];

const systemNav: NavItem[] = [
  { to: '/admin/workflows', label: 'Quy trình', icon: Workflow },
  { to: '/admin/llm-config', label: 'Cấu hình AI', icon: Sparkles },
];

function AdminLayout() {
  return (
    <PortalShell
      home="/admin"
      portalLabel="Quản trị hệ thống"
      navigation={
        <div className="space-y-4">
          <NavLink
            item={{
              to: '/admin',
              label: 'Tổng quan',
              icon: LayoutDashboard,
            }}
            exact
          />

          <AdminNavGroup label="Vận hành" items={operationsNav} />
          <AdminNavGroup label="Chuyên môn" items={clinicalAdminNav} />
          <AdminNavGroup label="Hệ thống" items={systemNav} />
        </div>
      }
    />
  );
}

function AdminNavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <NavGroup label={label}>
      {items.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
    </NavGroup>
  );
}

function NavLink({ item, exact = false }: { item: NavItem; exact?: boolean }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-800"
      activeProps={{
        className: 'bg-violet-100 text-violet-800 font-bold',
      }}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pb-1 text-[10px] font-black tracking-[0.16em] text-slate-400 uppercase">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
