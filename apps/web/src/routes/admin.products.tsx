import { createFileRoute, redirect } from '@tanstack/react-router';

/** Giữ URL cũ để bookmark không bị 404 sau khi tách portal kho. */
export const Route = createFileRoute('/admin/products')({
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/inventory' });
  },
});
