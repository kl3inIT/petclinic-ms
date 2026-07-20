import { Link, createFileRoute } from '@tanstack/react-router';

import { PortalShell } from '@/features/back-office/components/PortalShell';
import { STAFF_NAV_ITEMS } from '@/features/back-office/navigation';
import { requireAnyRole } from '@/features/auth/guards';

export const Route = createFileRoute('/staff')({
  beforeLoad: ({ location }) => {
    requireAnyRole({ redirectFrom: location.href, allowedRoles: ['STAFF'] });
  },
  component: StaffLayout,
});

function StaffLayout() {
  return (
    <PortalShell
      home="/staff"
      portalLabel="Lễ tân & thu ngân"
      navigation={
        <div className="space-y-1">
          {STAFF_NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: 'exact' in item ? item.exact : false }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-800"
              activeProps={{ className: 'bg-sky-100 text-sky-800 font-bold' }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      }
    />
  );
}
