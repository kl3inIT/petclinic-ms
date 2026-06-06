import { Link } from '@tanstack/react-router';
import {
  Bell,
  CircleHelp,
  CreditCard,
  Globe2,
  Headphones,
  PawPrint,
  ShieldCheck,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItem {
  to:
    | '/customer/profile'
    | '/customer/profile/security'
    | '/customer/profile/payments'
    | '/customer/profile/notifications'
    | '/customer/profile/language'
    | '/customer/profile/help';
  icon: LucideIcon;
  label: string;
  exact?: boolean;
}

const menuItems: MenuItem[] = [
  { to: '/customer/profile', icon: UserCircle2, label: 'Hồ sơ của tôi', exact: true },
  { to: '/customer/profile/security', icon: ShieldCheck, label: 'Bảo mật tài khoản' },
  { to: '/customer/profile/payments', icon: CreditCard, label: 'Phương thức thanh toán' },
  { to: '/customer/profile/notifications', icon: Bell, label: 'Thông báo' },
  { to: '/customer/profile/language', icon: Globe2, label: 'Ngôn ngữ' },
  { to: '/customer/profile/help', icon: CircleHelp, label: 'Trung tâm trợ giúp' },
];

export function ProfileSidebar() {
  return (
    <aside className="self-start rounded-[22px] border border-[#ECECF5] bg-white/95 p-3 shadow-[0_22px_60px_rgba(30,30,70,0.08)] backdrop-blur lg:sticky lg:top-24">
      <div className="relative mb-3 grid aspect-[4/3] place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[#7C6CF5] via-[#8E7DF7] to-[#A997FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
        <PawPrint className="size-20 text-white/85" />
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            activeProps={{
              className:
                'bg-[#F4F1FF] text-[#6D5CE8] shadow-[inset_0_0_0_1px_rgba(124,108,245,0.08)]',
            }}
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-[#F5F2FF] hover:text-[#6D5CE8]',
            )}
          >
            <item.icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-5 rounded-[18px] border border-[#ECECF5] bg-gradient-to-br from-[#F8F7FC] to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#F1EEFF] text-[#7C6CF5] shadow-sm">
          <Headphones className="size-5" />
        </span>
        <p className="mt-3 text-sm font-black text-slate-900">Cần hỗ trợ?</p>
        <p className="mt-2 text-xs leading-5 font-medium text-slate-500">
          Đội ngũ của chúng tôi luôn sẵn sàng giúp bạn.
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-3 rounded-xl border-[#E4DEFF] bg-white text-xs font-bold text-[#6D5CE8] shadow-sm hover:bg-[#F7F4FF]"
        >
          <Link to="/customer/profile/help">Liên hệ ngay</Link>
        </Button>
      </div>
    </aside>
  );
}
