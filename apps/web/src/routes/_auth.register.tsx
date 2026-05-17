import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/lib/api/generated/authentication/authentication';
import { registerSchema, type RegisterValues } from '@/features/auth/schemas';

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: () => {
        toast.success('Đăng ký thành công, vui lòng đăng nhập');
        void navigate({ to: '/login' });
      },
      onError: () => {
        toast.error('Username/email đã tồn tại hoặc dữ liệu không hợp lệ');
      },
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(({ username, email, password }) =>
        registerMutation.mutate({ data: { username, email, password } }),
      )}
      className="space-y-5"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Đăng ký</h1>
        <p className="text-sm text-muted-foreground">Tạo tài khoản PetClinic</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" autoComplete="username" {...form.register('username')} />
        {form.formState.errors.username ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Xác nhận password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
        />
        {form.formState.errors.confirmPassword ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Đang đăng ký…' : 'Đăng ký'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
