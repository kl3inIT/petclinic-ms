import { Outlet, createFileRoute } from '@tanstack/react-router';
import { Logo } from '@/components/logo';

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="auth-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-card/95 p-8 shadow-xl backdrop-blur-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <Outlet />
      </div>
    </main>
  );
}
