import { Link, createFileRoute, useLocation } from '@tanstack/react-router';
import {
  History,
  LayoutDashboard,
  Package,
  Pill,
  ShoppingBag,
  Stethoscope,
  Syringe,
  TriangleAlert,
} from 'lucide-react';

import { PortalShell } from '@/features/back-office/components/PortalShell';
import { requireAnyRole } from '@/features/auth/guards';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/inventory')({
  beforeLoad: ({ location }) => {
    requireAnyRole({
      redirectFrom: location.href,
      allowedRoles: ['INVENTORY_MANAGER'],
    });
  },
  component: InventoryLayout,
});

type ProductSearch = {
  type?: 'MEDICATION' | 'VACCINE' | 'SERVICE' | 'SUPPLY' | 'MERCHANDISE';
  lowStock?: boolean;
  view?: 'ledger';
};

const catalogNav = [
  { label: 'Tất cả sản phẩm', icon: Package, search: {} },
  { label: 'Thuốc', icon: Pill, search: { type: 'MEDICATION' } },
  { label: 'Vaccine', icon: Syringe, search: { type: 'VACCINE' } },
  { label: 'Vật tư', icon: Package, search: { type: 'SUPPLY' } },
  { label: 'Dịch vụ', icon: Stethoscope, search: { type: 'SERVICE' } },
  { label: 'Hàng bán lẻ', icon: ShoppingBag, search: { type: 'MERCHANDISE' } },
] as const;

const inventoryNav = [
  { label: 'Sắp hết hàng', icon: TriangleAlert, search: { lowStock: true } },
  { label: 'Sổ cái kho', icon: History, search: { view: 'ledger' } },
] as const;

function InventoryLayout() {
  const location = useLocation();
  const currentSearch = location.search as ProductSearch;

  return (
    <PortalShell
      home="/inventory"
      portalLabel="Quản lý kho"
      navigation={
        <div className="space-y-4">
          <Link
            to="/inventory"
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
            activeProps={{ className: 'bg-emerald-100 text-emerald-800 font-bold' }}
          >
            <LayoutDashboard className="size-4" />
            Tổng quan kho
          </Link>

          <InventoryNavGroup
            label="Danh mục sản phẩm"
            items={catalogNav}
            pathname={location.pathname}
            currentSearch={currentSearch}
          />
          <InventoryNavGroup
            label="Kho hàng"
            items={inventoryNav}
            pathname={location.pathname}
            currentSearch={currentSearch}
          />
        </div>
      }
    />
  );
}
function InventoryNavGroup({
  label,
  items,
  pathname,
  currentSearch,
}: {
  label: string;
  items: ReadonlyArray<{
    label: string;
    icon: typeof Package;
    search: ProductSearch;
  }>;
  pathname: string;
  currentSearch: ProductSearch;
}) {
  return (
    <div>
      <div className="px-3 pb-1 text-[10px] font-black tracking-[0.16em] text-slate-400 uppercase">
        {label}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = isProductNavActive(pathname, currentSearch, item.search);
          return (
            <Link
              key={item.label}
              to="/inventory/products"
              search={item.search}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-800',
                active && 'bg-emerald-100 font-bold text-emerald-800',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isProductNavActive(
  pathname: string,
  current: ProductSearch,
  target: ProductSearch,
) {
  if (pathname !== '/inventory/products') return false;
  if (target.view) return current.view === target.view;
  if (target.lowStock) return current.lowStock === true && current.view == null;
  if (target.type) {
    return current.type === target.type && !current.lowStock && current.view == null;
  }
  return current.type == null && !current.lowStock && current.view == null;
}
