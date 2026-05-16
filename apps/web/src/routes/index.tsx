import { Link, createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">PetClinic</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Spring Boot 4 microservices + React 19 frontend
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/login">Đăng nhập</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin">Vào Admin</Link>
        </Button>
      </div>
    </main>
  );
}
