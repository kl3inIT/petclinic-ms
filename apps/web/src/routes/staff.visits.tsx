import { createFileRoute } from '@tanstack/react-router';

import { VisitsPage } from './admin.visits';

export const Route = createFileRoute('/staff/visits')({
  component: StaffVisitsPage,
});

function StaffVisitsPage() {
  return <VisitsPage mode="reception" />;
}
