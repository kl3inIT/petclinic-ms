import { createFileRoute } from '@tanstack/react-router';

import { PetsPage } from './admin.pets';

export const Route = createFileRoute('/staff/pets')({
  component: PetsPage,
});
