import { Link } from '@tanstack/react-router';
import {
  Bell,
  Globe2,
  Headphones,
  ShieldCheck,
  Sparkles,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItem {
  to:
    | '/vet/settings'
    | '/vet/settings/security'
    | '/vet/settings/notifications'
    | '/vet/settings/language';
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  comingSoon?: boolean;
}

const menuItems: MenuItem[] = [
  { to: '/vet/settings', icon: UserCog, label: 'Tài khoản', exact: true },
  {
    to: '/vet/settings/security',
    icon: ShieldCheck,
    label: 'Bảo mật & mật khẩu',
    comingSoon: true,
  },
  { to: '/vet/settings/notifications', icon: Bell, label: 'Thông báo' },
  {
    to: '/vet/settings/language',
    icon: Globe2,
    label: 'Ngôn ngữ',
    comingSoon: true,
  },
];

export function SettingsSidebar() {
  return (
    <aside className="self-start rounded-[22px] border border-[#ECECF5] bg-white/95 p-3 shadow-[0_22px_60px_rgba(30,30,70,0.08)] backdrop-blur lg:sticky lg:top-6">
      <div className="relative mb-3 overflow-hidden rounded-[18px] bg-gradient-to-br from-violet-600 via-violet-500 to-rose-400 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
        <Sparkles className="absolute top-3 right-3 size-4 opacity-60" />
        <p className="text-[10px] font-bold tracking-[0.2em] text-violet-100 uppercase">
          Vet portal
        </p>
        <p className="mt-1 text-base leading-tight font-extrabold">Cài đặt</p>
        <p className="mt-1 text-[11px] leading-snug font-medium text-violet-100/90">
          Quản lý tài khoản, bảo mật và sở thích hiển thị.
        </p>
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
            <span className="flex-1 truncate">{item.label}</span>
            {item.comingSoon && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700 uppercase">
                Soon
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-5 rounded-[18px] border border-[#ECECF5] bg-gradient-to-br from-[#F8F7FC] to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#F1EEFF] text-[#7C6CF5] shadow-sm">
          <Headphones className="size-5" />
        </span>
        <p className="mt-3 text-sm font-black text-slate-900">Cần admin hỗ trợ?</p>
        <p className="mt-2 text-xs leading-5 font-medium text-slate-500">
          Đổi email, đổi mật khẩu, cập nhật chuyên khoa — hãy liên hệ quản trị viên.
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-3 rounded-xl border-[#E4DEFF] bg-white text-xs font-bold text-[#6D5CE8] shadow-sm hover:bg-[#F7F4FF]"
        >
          <a href="mailto:admin@petclinic.local">Gửi email admin</a>
        </Button>
      </div>
    </aside>
  );
}
