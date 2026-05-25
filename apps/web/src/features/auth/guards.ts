import { redirect } from '@tanstack/react-router';

import { useAuthStore } from './store';

/**
 * Role-based route guard cho TanStack Router `beforeLoad`. Throw redirect
 * — Router treat throw redirect như intentional flow control.
 *
 * <p>Rule:
 * <ol>
 *   <li>Chưa login → /login với redirect param.</li>
 *   <li>Login rồi nhưng KHÔNG có role nào trong {@code allowedRoles} → /403.</li>
 *   <li>ADMIN luôn pass (override) — convention enterprise.</li>
 * </ol>
 */
export function requireAuth(opts: { redirectFrom: string }) {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/login', search: { redirect: opts.redirectFrom } });
  }
}

export function requireAnyRole(opts: {
  redirectFrom: string;
  allowedRoles: readonly string[];
}) {
  requireAuth({ redirectFrom: opts.redirectFrom });
  const { user } = useAuthStore.getState();
  const userRoles = user?.roles ?? [];
  // ADMIN override — luôn pass.
  if (userRoles.includes('ADMIN')) {
    return;
  }
  const hasAccess = userRoles.some((r) => opts.allowedRoles.includes(r));
  if (!hasAccess) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/forbidden', search: { from: opts.redirectFrom } });
  }
}
