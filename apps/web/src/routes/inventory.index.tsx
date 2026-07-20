import { createFileRoute } from '@tanstack/react-router';

import { InventoryDashboard } from '@/features/products/components/InventoryDashboard';

export const Route = createFileRoute('/inventory/')({
  component: InventoryDashboard,
});
