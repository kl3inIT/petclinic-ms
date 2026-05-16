import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/features/auth/api';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
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

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: { id: data.userId, username: data.username, roles: data.roles },
      });
      toast.success(`Xin chào ${data.username}`);
      void navigate({ to: search.redirect ?? '/admin' });
    },
    onError: () => {
      toast.error('Username hoặc password không đúng');
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
      className="space-y-5"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">
          Truy cập PetClinic admin portal
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          autoComplete="username"
          {...form.register('username')}
        />
        {form.formState.errors.username ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

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
