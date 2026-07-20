import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/lib/form/FieldError';
import { useLogin } from '@/lib/api/generated/authentication/authentication';
import { loginSchema } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/store';

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/login')({
  validateSearch: searchSchema,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/_auth/login' });
  const setSession = useAuthStore((s) => s.setSession);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setSession({
          accessToken: data.accessToken!,
          refreshToken: data.refreshToken!,
          user: { id: data.userId!, username: data.username!, roles: data.roles ?? [] },
        });
        toast.success(`Xin chào ${data.username}`);
        // Mỗi role có portal riêng; ADMIN được ưu tiên vì tài khoản admin seed
        // đồng thời mang USER. URL redirect vẫn được giữ cho deep link hợp lệ.
        // URL search.redirect override role-based default (deep-link login).
        const roles = data.roles ?? [];
        const roleHome = roles.includes('ADMIN')
          ? '/admin'
          : roles.includes('INVENTORY_MANAGER')
            ? '/inventory'
            : roles.includes('STAFF')
              ? '/staff'
              : roles.includes('VET')
                ? '/vet'
                : '/';
        void navigate({ to: search.redirect ?? roleHome });
      },
      onError: () => {
        toast.error('Username hoặc password không đúng');
      },
    },
  });

  const form = useForm({
    defaultValues: { username: '', password: '' },
    validators: { onChange: loginSchema },
    onSubmit: ({ value }) => loginMutation.mutate({ data: value }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-5"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Đăng nhập vào PetClinic</p>
      </div>

      <form.Field
        name="username"
        children={(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Username</Label>
            <Input
              id={field.name}
              autoComplete="username"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </div>
        )}
      />

      <form.Field
        name="password"
        children={(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Password</Label>
            <div className="relative">
              <Input
                id={field.name}
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {passwordVisible ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
            <FieldError field={field} />
          </div>
        )}
      />

      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
