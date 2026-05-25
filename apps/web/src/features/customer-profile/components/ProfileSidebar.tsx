import { Link } from '@tanstack/react-router';
import {
  Bell,
  CircleHelp,
  CreditCard,
  Globe2,
  Headphones,
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

const petHero =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=520&q=80&auto=format&fit=crop';

export function ProfileSidebar() {
  return (
    <aside className="self-start rounded-[22px] border border-[#ECECF5] bg-white/95 p-3 shadow-[0_22px_60px_rgba(30,30,70,0.08)] backdrop-blur lg:sticky lg:top-24">
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-[18px] bg-[#7C6CF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
        <img
          src={petHero}
          alt=""
          className="size-full object-cover object-center opacity-90 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C6CF5]/35 via-transparent to-[#A997FF]/45" />
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
