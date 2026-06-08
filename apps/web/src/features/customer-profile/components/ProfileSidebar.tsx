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
    <aside className="self-start rounded-[22px] border border-border bg-card p-3 shadow-[0_22px_60px_rgba(15,23,42,0.06)] lg:sticky lg:top-24">
      <div className="relative mb-3 grid aspect-[4/3] place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-primary via-primary to-primary/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
        <PawPrint className="size-20 text-primary-foreground/85" />
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            activeProps={{
              className: 'bg-accent text-accent-foreground',
            }}
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <item.icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-5 rounded-[18px] border border-border bg-muted/40 p-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Headphones className="size-5" />
        </span>
        <p className="mt-3 text-sm font-black text-foreground">Cần hỗ trợ?</p>
        <p className="mt-2 text-xs leading-5 font-medium text-muted-foreground">
          Đội ngũ của chúng tôi luôn sẵn sàng giúp bạn.
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-3 w-full text-xs font-bold"
        >
          <Link to="/customer/profile/help">Liên hệ ngay</Link>
        </Button>
      </div>
    </aside>
  );
}
