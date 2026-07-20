import { CalendarCheck, LayoutDashboard, PawPrint, Receipt, Users } from 'lucide-react';

export const STAFF_NAV_ITEMS = [
  { to: '/staff', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { to: '/staff/visits', label: 'Lịch hẹn', icon: CalendarCheck },
  { to: '/staff/owners', label: 'Chủ nuôi', icon: Users },
  { to: '/staff/pets', label: 'Thú cưng', icon: PawPrint },
  { to: '/staff/invoices', label: 'Quầy thu ngân', icon: Receipt },
] as const;
