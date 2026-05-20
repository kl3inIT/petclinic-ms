import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
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

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setSession({
          accessToken: data.accessToken!,
          refreshToken: data.refreshToken!,
          user: { id: data.userId!, username: data.username!, roles: data.roles ?? [] },
        });
        toast.success(`Xin chào ${data.username}`);
        void navigate({ to: search.redirect ?? '/admin' });
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
        <p className="text-sm text-muted-foreground">Truy cập PetClinic admin portal</p>
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
            <Input
              id={field.name}
              type="password"
              autoComplete="current-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
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
