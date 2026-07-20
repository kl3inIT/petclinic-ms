import { createFileRoute } from '@tanstack/react-router';

import { StorePage } from '@/features/store/components/StorePage';

export const Route = createFileRoute('/store')({
  component: StorePage,
});
