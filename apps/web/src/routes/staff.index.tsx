import { createFileRoute } from '@tanstack/react-router';

import { StaffDashboard } from '@/features/back-office/components/OperationsDashboard';

export const Route = createFileRoute('/staff/')({
  component: StaffDashboard,
});
