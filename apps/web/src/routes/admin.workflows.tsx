import { createFileRoute } from '@tanstack/react-router';

import { WorkflowControlCenter } from '@/features/workflows/components/WorkflowControlCenter';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

export const Route = createFileRoute('/admin/workflows')({
  component: WorkflowsPage,
});

function WorkflowsPage() {
  return (
    <div className="-m-6 h-screen overflow-hidden p-1">
      <WorkflowControlCenter />
    </div>
  );
}
