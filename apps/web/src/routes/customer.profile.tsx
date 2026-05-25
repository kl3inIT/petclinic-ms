import { Outlet, createFileRoute } from '@tanstack/react-router';

import { ProfileSidebar } from '@/features/customer-profile/components/ProfileSidebar';

export const Route = createFileRoute('/customer/profile')({
  component: ProfileLayout,
});

/**
 * Layout shell cho /customer/profile/* — sidebar fixed bên trái, page content render
 * qua Outlet. Mỗi sub-route declare metadata + content riêng (xem
 * customer.profile.index, .security, .payments, .notifications, .language, .help).
 */
function ProfileLayout() {
  return (
    <div className="w-full px-4 py-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <ProfileSidebar />
          <main className="space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
