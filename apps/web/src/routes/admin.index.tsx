import { createFileRoute } from '@tanstack/react-router';

import { SystemAdminDashboard } from '@/features/back-office/components/OperationsDashboard';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  return <SystemAdminDashboard />;
}
