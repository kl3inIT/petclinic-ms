import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Tổng quan hệ thống — widget metrics, recent activity sẽ đặt ở đây.
      </p>
    </div>
  );
}
