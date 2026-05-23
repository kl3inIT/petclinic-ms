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
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[190px_1fr]">
        <ProfileSidebar />

        <div className="space-y-7">
          <section>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Hồ sơ của tôi
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Quản lý thông tin tài khoản, bảo mật và liên kết nhanh.
            </p>
            <div className="mt-3 h-1 w-8 rounded-full bg-violet-600" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_400px]">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <SectionTitle icon={UserCircle2} title="Thông tin tài khoản" />

              <div className="mt-7 flex items-center gap-5">
                <div className="relative flex size-20 items-center justify-center rounded-full bg-violet-100 text-violet-600 ring-8 ring-violet-50">
                  <UserCircle2 className="size-14" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-900">{username}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(user?.roles?.length ? user.roles : ['USER']).map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="gap-1 rounded-md bg-violet-100 px-2 text-[10px] font-black text-violet-700"
                      >
                        <ShieldCheck className="size-3" />
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-7 divide-y divide-slate-100 border-t border-slate-200">
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

              <div className="mt-5 flex items-center justify-between gap-4 overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500">
                    <Shield className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-orange-700">
                      Giữ tài khoản của bạn luôn an toàn
                    </p>
                    <p className="mt-1 text-xs leading-5 font-medium text-slate-600">
                      Để bảo vệ tài khoản, vui lòng không chia sẻ email, mật khẩu hoặc mã
                      xác thực với bất kỳ ai.
                    </p>
                  </div>
                </div>
                <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 sm:flex">
                  <LockKeyhole className="size-8" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
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
                  className="mt-5 h-14 w-full justify-between rounded-lg bg-rose-500 px-5 font-black shadow-lg shadow-rose-100 hover:bg-rose-600"
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

              <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 shadow-[0_12px_35px_rgba(16,185,129,0.08)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white text-emerald-600">
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

          <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-violet-50 px-6 py-5 shadow-[0_18px_45px_rgba(124,58,237,0.08)]">
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
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
                className="rounded-lg bg-violet-600 px-5 font-bold shadow-lg shadow-violet-200 hover:bg-violet-700"
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
  );
}

function ProfileSidebar() {
  return (
    <aside className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="relative mb-3 h-32 overflow-hidden rounded-xl bg-violet-500">
        <img
          src={petHero}
          alt=""
          className="size-full object-cover object-center opacity-95 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-violet-500/25" />
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700',
              item.active && 'bg-violet-50 text-violet-700',
            )}
          >
            <item.icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          <Headphones className="size-5" />
        </span>
        <p className="mt-3 text-sm font-black text-slate-800">Cần hỗ trợ?</p>
        <p className="mt-2 text-xs leading-5 font-medium text-slate-500">
          Đội ngũ của chúng tôi luôn sẵn sàng giúp bạn.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 rounded-lg border-violet-200 bg-white text-xs font-bold text-violet-700 hover:bg-violet-50"
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
      <span className="flex size-10 items-center justify-center rounded-full bg-violet-50 text-violet-600">
        <Icon className="size-5" />
      </span>
      <h2 className="font-black text-slate-900">{title}</h2>
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
    <div className="grid gap-3 py-4 sm:grid-cols-[24px_1fr_auto] sm:items-center">
      <Icon className="hidden size-4 text-slate-500 sm:block" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p
          className={cn(
            'mt-1 text-sm font-semibold break-words text-slate-800',
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
          className="w-fit rounded-lg border-violet-200 text-xs font-black text-violet-700 hover:bg-violet-50"
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
      className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-violet-200 hover:bg-violet-50"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
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
      <ChevronRight className="size-5 shrink-0 text-slate-400" />
    </Link>
  );
}
