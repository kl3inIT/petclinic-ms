import { Link, createFileRoute } from '@tanstack/react-router';
import {
  AtSign,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Copy,
  CreditCard,
  Globe2,
  Headphones,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  PawPrint,
  Shield,
  ShieldCheck,
  UserCircle2,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/lib/api/generated/authentication/authentication';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/customer/profile')({
  component: CustomerProfilePage,
});

const petHero =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=520&q=80&auto=format&fit=crop';

const menuItems = [
  { label: 'Hồ sơ của tôi', icon: UserCircle2, active: true },
  { label: 'Bảo mật tài khoản', icon: ShieldCheck },
  { label: 'Phương thức thanh toán', icon: CreditCard },
  { label: 'Thông báo', icon: Bell },
  { label: 'Ngôn ngữ', icon: Globe2 },
  { label: 'Trung tâm trợ giúp', icon: CircleHelp },
];

function CustomerProfilePage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const username = user?.username ?? 'customer@petclinic.local';
  const userId = user?.id ?? '10000000-0000-0000-0000-000000000001';

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clear();
        window.location.href = '/';
      },
    },
  });

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="mx-auto w-[1070px] max-w-none min-w-[1070px]">
        <div className="grid grid-cols-[210px_828px] items-start gap-8">
          <ProfileSidebar />

          <div className="space-y-7">
            <section>
              <h1 className="text-[30px] leading-tight font-black tracking-tight text-slate-950">
                Hồ sơ của tôi
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Quản lý thông tin tài khoản, bảo mật và liên kết nhanh.
              </p>
              <div className="mt-3 h-1 w-9 rounded-full bg-[#7C6CF5] shadow-[0_6px_14px_rgba(124,108,245,0.35)]" />
            </section>

            <section className="grid grid-cols-[448px_360px] items-start gap-5">
              <div className="relative min-h-[504px] overflow-hidden rounded-[22px] border border-[#ECECF5] bg-white/95 p-5 shadow-[0_22px_60px_rgba(30,30,70,0.08)] backdrop-blur">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F6F3FF] to-transparent" />
                <div className="relative">
                  <SectionTitle icon={UserCircle2} title="Thông tin tài khoản" />

                  <div className="mt-7 flex items-center gap-5">
                    <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-white via-[#F2EFFF] to-[#DDD7FF] text-[#7C6CF5] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_34px_rgba(124,108,245,0.18)] ring-8 ring-[#F5F2FF]">
                      <UserCircle2 className="size-14" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-black text-slate-950">
                        {username}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(user?.roles?.length ? user.roles : ['USER']).map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="gap-1 rounded-md border border-[#E7E1FF] bg-[#F4F1FF] px-2 text-[10px] font-black text-[#6C5CEB] shadow-sm"
                          >
                            <ShieldCheck className="size-3" />
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 divide-y divide-[#F0F0F7] border-t border-[#ECECF5]">
                    <AccountRow
                      icon={AtSign}
                      label="Tên đăng nhập (Username)"
                      value={username}
                      action="Đổi"
                    />
                    <AccountRow icon={Mail} label="Email" value={username} action="Đổi" />
                    <AccountRow
                      icon={Copy}
                      label="Mã người dùng"
                      value={userId}
                      action="Sao chép"
                      mono
                      onAction={() => void navigator.clipboard?.writeText(String(userId))}
                    />
                    <AccountRow
                      icon={CalendarCheck}
                      label="Ngày tham gia"
                      value="15/04/2024"
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-[#FFE5B7] bg-gradient-to-r from-[#FFF8EA] via-[#FFF6E8] to-[#FFF0DB] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#F59E0B] shadow-sm ring-1 ring-orange-100">
                        <Shield className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#B76B09]">
                          Giữ tài khoản của bạn luôn an toàn
                        </p>
                        <p className="mt-1 text-xs leading-5 font-medium text-slate-600">
                          Để bảo vệ tài khoản, vui lòng không chia sẻ email, mật khẩu hoặc
                          mã xác thực với bất kỳ ai.
                        </p>
                      </div>
                    </div>
                    <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EEE9FF] to-white text-[#7C6CF5] shadow-sm ring-1 ring-[#E8E2FF] sm:flex">
                      <LockKeyhole className="size-8" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="min-h-[336px] rounded-[22px] border border-[#ECECF5] bg-white/95 p-5 shadow-[0_22px_60px_rgba(30,30,70,0.08)] backdrop-blur">
                  <SectionTitle icon={KeyRound} title="Liên kết nhanh" />
                  <div className="mt-6 space-y-3">
                    <QuickLink
                      to="/customer/book"
                      icon={CalendarCheck}
                      title="Đặt lịch khám"
                      description="Đặt lịch khám mới cho thú cưng"
                    />
                    <QuickLink
                      to="/customer/visits"
                      icon={CalendarCheck}
                      title="Lịch sử khám"
                      description="Xem lịch sử khám và kết quả"
                    />
                    <QuickLink
                      to="/customer/pets"
                      icon={PawPrint}
                      title="Thú cưng của tôi"
                      description="Quản lý thông tin thú cưng"
                    />
                  </div>

                  <Button
                    className="mt-5 h-14 w-full justify-between rounded-xl bg-gradient-to-r from-[#F94F6D] to-[#F43F5E] px-5 font-black shadow-[0_16px_32px_rgba(244,63,94,0.22)] hover:from-[#EF4564] hover:to-[#E93656]"
                    disabled={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                  >
                    <span className="flex items-center gap-3">
                      <LogOut className="size-5" />
                      <span className="text-left">
                        <span className="block text-sm">Đăng xuất</span>
                        <span className="block text-xs font-medium text-white/80">
                          {logoutMutation.isPending
                            ? 'Đang thoát tài khoản'
                            : 'Thoát khỏi tài khoản hiện tại'}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="size-5" />
                  </Button>
                </div>

                <div className="flex min-h-[94px] items-center justify-between gap-4 rounded-xl border border-[#C8F4E0] bg-gradient-to-r from-[#F0FFF8] to-[#ECFBF6] px-5 py-4 text-emerald-700 shadow-[0_16px_40px_rgba(16,185,129,0.09)]">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black">Tài khoản của bạn được bảo vệ</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        Lần đăng nhập cuối: 09:32 AM, 23/05/2026
                      </p>
                      <p className="text-xs font-medium text-slate-600">
                        Thiết bị: Chrome trên Windows
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="size-5 shrink-0" />
                </div>
              </div>
            </section>

            <section className="relative min-h-[112px] overflow-hidden rounded-[22px] border border-[#E8E2FF] bg-gradient-to-r from-[#F6F2FF] via-[#F7F4FF] to-[#EEE9FF] px-6 py-5 shadow-[0_22px_55px_rgba(124,108,245,0.12)]">
              <div className="pointer-events-none absolute inset-0 bg-white/20" />
              <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-[#7C6CF5] shadow-[0_14px_30px_rgba(124,108,245,0.15)] ring-1 ring-white">
                    <CalendarCheck className="size-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Đặt lịch khám dễ dàng
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 font-medium text-slate-600">
                      Chăm sóc sức khỏe thú cưng chưa bao giờ đơn giản đến thế!
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="rounded-xl bg-[#7C6CF5] px-5 font-bold shadow-[0_16px_34px_rgba(124,108,245,0.28)] hover:bg-[#6D5CE8]"
                >
                  <Link to="/customer/book">Đặt lịch ngay</Link>
                </Button>
              </div>
              <img
                src={petHero}
                alt=""
                className="pointer-events-none absolute right-14 bottom-0 hidden h-28 w-72 rounded-t-[36px] object-cover object-top opacity-90 mix-blend-multiply lg:block"
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSidebar() {
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
          <button
            key={item.label}
            type="button"
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-bold text-slate-600 transition-all duration-200 hover:bg-[#F5F2FF] hover:text-[#6D5CE8]',
              item.active &&
                'bg-[#F4F1FF] text-[#6D5CE8] shadow-[inset_0_0_0_1px_rgba(124,108,245,0.08)]',
            )}
          >
            <item.icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </button>
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
          variant="outline"
          size="sm"
          className="mt-3 rounded-xl border-[#E4DEFF] bg-white text-xs font-bold text-[#6D5CE8] shadow-sm hover:bg-[#F7F4FF]"
        >
          Liên hệ ngay
        </Button>
      </div>
    </aside>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#F7F4FF] to-white text-[#7C6CF5] shadow-sm ring-1 ring-[#ECE7FF]">
        <Icon className="size-5" />
      </span>
      <h2 className="text-[15px] font-black text-slate-950">{title}</h2>
    </div>
  );
}

function AccountRow({
  icon: Icon,
  label,
  value,
  action,
  mono,
  onAction,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  action?: string;
  mono?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl py-4 transition-colors hover:bg-[#FBFAFF] sm:grid-cols-[24px_1fr_auto] sm:items-center sm:px-2">
      <Icon className="hidden size-4 text-slate-500 sm:block" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p
          className={cn(
            'mt-1 text-sm font-semibold break-words text-slate-900',
            mono && 'font-mono text-xs',
          )}
        >
          {value}
        </p>
      </div>
      {action ? (
        <Button
          variant="outline"
          size="xs"
          className="w-fit rounded-lg border-[#E1DAFF] bg-white text-xs font-black text-[#6D5CE8] shadow-sm hover:bg-[#F6F3FF]"
          onClick={onAction}
        >
          {action === 'Sao chép' ? <Copy className="size-3" /> : null}
          {action}
        </Button>
      ) : null}
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: '/customer/book' | '/customer/visits' | '/customer/pets';
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-[#ECECF5] bg-white/90 px-4 py-3 shadow-[0_8px_22px_rgba(30,30,70,0.04)] transition-all duration-200 hover:border-[#DED6FF] hover:bg-[#FBFAFF] hover:shadow-[0_14px_30px_rgba(124,108,245,0.1)]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F4F1FF] text-[#7C6CF5] shadow-sm ring-1 ring-[#ECE7FF] transition group-hover:bg-[#7C6CF5] group-hover:text-white">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-800">
            {title}
          </span>
          <span className="mt-1 block truncate text-xs font-medium text-slate-500">
            {description}
          </span>
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#7C6CF5]" />
    </Link>
  );
}
