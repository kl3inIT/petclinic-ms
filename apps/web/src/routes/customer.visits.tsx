import { createFileRoute } from '@tanstack/react-router';

import { CustomerVisitsView } from '@/features/visits/customer/CustomerVisitsView';

export const Route = createFileRoute('/customer/visits')({
  component: CustomerVisitsView,
});
