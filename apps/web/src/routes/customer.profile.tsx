import { Link, createFileRoute } from '@tanstack/react-router';
import {
  AtSign,
  CalendarCheck,
  LogOut,
  Mail,
  PawPrint,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/lib/api/generated/authentication/authentication';

export const Route = createFileRoute('/customer/profile')({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        clear();
        window.location.href = '/';
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hồ sơ của tôi</h1>
        <p className="text-sm text-muted-foreground">
          Thông tin tài khoản, vai trò và liên kết nhanh.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserCircle2 className="size-10" />
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.username ?? '—'}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {user?.roles?.map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs">
                      <ShieldCheck className="size-3" /> {r}
                    </Badge>
                  )) ?? null}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field icon={AtSign} label="Username" value={user?.username ?? '—'} />
              <Field icon={Mail} label="Mã người dùng" value={user?.id ?? '—'} mono />
            </div>

            <Separator />

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              ⓘ Để cập nhật email, số điện thoại hoặc đổi mật khẩu, vui lòng liên hệ quầy
              lễ tân — tính năng tự cập nhật sẽ ra mắt trong bản tiếp theo.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liên kết nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/customer/book">
                <CalendarCheck className="size-4" /> Đặt lịch khám
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/customer/visits">
                <CalendarCheck className="size-4" /> Lịch sử khám
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/customer/pets">
                <PawPrint className="size-4" /> Thú cưng của tôi
              </Link>
            </Button>
            <Separator className="my-2" />
            <Button
              variant="destructive"
              className="w-full justify-start"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="size-4" />
              {logoutMutation.isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof AtSign;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className={mono ? 'font-mono text-sm' : 'text-sm font-medium'}>{value}</p>
    </div>
  );
}
