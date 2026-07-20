import { Link, createFileRoute } from '@tanstack/react-router';
import { ShieldX } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';

const forbiddenSearch = z.object({
  from: z.string().optional(),
});

export const Route = createFileRoute('/forbidden')({
  validateSearch: forbiddenSearch,
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const { from } = Route.useSearch();
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];

  // Suggest home route theo role thực tế của user — giảm friction.
  const homePath: '/admin' | '/staff' | '/inventory' | '/vet' | '/customer' | '/login' =
    roles.includes('ADMIN')
      ? '/admin'
      : roles.includes('INVENTORY_MANAGER')
        ? '/inventory'
        : roles.includes('STAFF')
          ? '/staff'
          : roles.includes('VET')
            ? '/vet'
            : roles.includes('USER')
              ? '/customer'
              : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-[0_18px_40px_rgba(244,63,94,0.18)]">
        <ShieldX className="size-10" />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-3xl font-black text-slate-900">403 — Không có quyền</h1>
        <p className="text-sm leading-6 font-medium text-slate-500">
          Tài khoản của bạn (vai trò{' '}
          <span className="font-bold text-slate-700">
            {roles.length > 0 ? roles.join(', ') : 'chưa rõ'}
          </span>
          ) không được phép truy cập trang này
          {from ? (
            <>
              {' '}
              <span className="font-mono text-xs text-slate-400">({from})</span>
            </>
          ) : null}
          .
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild className="rounded-xl bg-slate-900 font-bold hover:bg-slate-800">
          <Link to={homePath}>Về trang chính</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl font-bold">
          <Link to="/login">Đăng nhập tài khoản khác</Link>
        </Button>
      </div>
    </div>
  );
}
