import { Link, createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-muted/30 p-8">
      <Logo size="xl" />
      <p className="max-w-xl text-center text-lg text-muted-foreground">
        Spring Boot 4 microservices + React 19 — quản lý phòng khám thú y hiện đại.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link to="/login">Đăng nhập</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/admin">Vào Admin</Link>
        </Button>
      </div>
    </main>
  );
}
