import { createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store';
import { WorkflowControlCenter } from '@/features/workflows/components/WorkflowControlCenter';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

export const Route = createFileRoute('/admin/workflows')({
  beforeLoad: () => {
    // Quản lý quy trình BPMN chỉ ADMIN. STAFF gõ URL trực tiếp → về /admin.
    const user = useAuthStore.getState().user;
    if (!user?.roles.includes('ADMIN')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/admin' });
    }
  },
  component: WorkflowsPage,
});

function WorkflowsPage() {
  return (
    <div className="-m-6 h-screen overflow-hidden p-1">
      <WorkflowControlCenter />
    </div>
  );
}
