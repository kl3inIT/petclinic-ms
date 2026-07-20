import { createFileRoute } from '@tanstack/react-router';

import { InvoicesPage } from './admin.invoices';

export const Route = createFileRoute('/staff/invoices')({
  component: InvoicesPage,
});
