import { Outlet, createFileRoute } from '@tanstack/react-router';

import { SettingsSidebar } from '@/features/vet-settings/components/SettingsSidebar';

export const Route = createFileRoute('/vet/settings')({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <div className="w-full pb-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsSidebar />
        <main className="space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
