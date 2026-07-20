import { createFileRoute } from '@tanstack/react-router';

import { OwnersPage } from './admin.owners';

export const Route = createFileRoute('/staff/owners')({
  component: OwnersPage,
});
