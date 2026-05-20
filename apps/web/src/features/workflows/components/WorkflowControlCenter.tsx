import { type ComponentType, type ReactNode, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Database,
  Grid2X2,
  Info,
  LayoutDashboard,
  ListTree,
  Menu,
  PencilRuler,
  RefreshCw,
  Settings,
  Shield,
  Users,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  listProcessInstances,
  listUserTasks,
  listWorkflowDefinitions,
  listWorkflowDeployments,
  type WorkflowDefinitionSummary,
} from '@/features/workflows/api';
import { DeploymentList } from '@/features/workflows/components/DeploymentList';
import { ProcessDefinitionList } from '@/features/workflows/components/ProcessDefinitionList';
import { ProcessInstancesTab } from '@/features/workflows/components/ProcessInstancesTab';
import { UserTasksTab } from '@/features/workflows/components/UserTasksTab';
import { WorkflowDesigner } from '@/features/workflows/components/WorkflowDesigner';

type FlowsetSection =
  | 'dashboard'
  | 'modeler'
  | 'processes'
  | 'instances'
  | 'incidents'
  | 'tasks'
  | 'decisions'
  | 'deployments'
  | 'engines'
  | 'users'
  | 'roles'
  | 'about';

type MenuItem = {
  id: FlowsetSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const MENU_GROUPS: Array<{ label: string; items: MenuItem[] }> = [
  {
    label: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'modeler', label: 'Process Modeler', icon: PencilRuler },
      { id: 'processes', label: 'Processes', icon: ListTree },
      { id: 'instances', label: 'Process instances', icon: Activity },
      { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
      { id: 'tasks', label: 'User tasks', icon: ClipboardList },
    ],
  },
  {
    label: 'DMN',
    items: [{ id: 'decisions', label: 'Decisions', icon: Grid2X2 }],
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'deployments', label: 'Deployments', icon: Database },
      { id: 'engines', label: 'BPM engines', icon: Settings },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'roles', label: 'Roles', icon: Shield },
    ],
  },
  {
    label: 'SUPPORT',
    items: [{ id: 'about', label: 'About', icon: Info }],
  },
];

const SECTION_META: Record<FlowsetSection, { title: string; icon: ComponentType<{ className?: string }> }> = {
  dashboard: { title: 'Dashboard', icon: LayoutDashboard },
  modeler: { title: 'BPMN Modeler', icon: PencilRuler },
  processes: { title: 'Processes', icon: ListTree },
  instances: { title: 'Process instances', icon: Activity },
  incidents: { title: 'Incidents', icon: AlertTriangle },
  tasks: { title: 'User tasks', icon: ClipboardList },
  decisions: { title: 'Decisions', icon: Grid2X2 },
  deployments: { title: 'Deployments', icon: Database },
  engines: { title: 'BPM engines', icon: Settings },
  users: { title: 'Users', icon: Users },
  roles: { title: 'Roles', icon: Shield },
  about: { title: 'About', icon: Info },
};

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[3px] border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon className="size-5 text-[#0f5b6b]" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyModule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[520px] items-center justify-center border border-dashed bg-white">
      <div className="max-w-md text-center">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{children}</p>
      </div>
    </div>
  );
}

function DashboardPanel({
  definitions,
  onOpenProcesses,
  onOpenInstances,
  onOpenTasks,
}: {
  definitions: WorkflowDefinitionSummary[];
  onOpenProcesses: () => void;
  onOpenInstances: () => void;
  onOpenTasks: () => void;
}) {
  const { data: instances = [] } = useQuery({
    queryKey: ['workflow-dashboard', 'instances'],
    queryFn: () => listProcessInstances(),
    refetchInterval: 5000,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['workflow-dashboard', 'tasks'],
    queryFn: () => listUserTasks(),
    refetchInterval: 5000,
  });
  const { data: deployments = [] } = useQuery({
    queryKey: ['workflow-dashboard', 'deployments'],
    queryFn: listWorkflowDeployments,
  });

  const activeInstances = instances.filter((item) => item.state === 'ACTIVE').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Process definitions" value={definitions.length} icon={ListTree} />
        <MetricTile label="Active instances" value={activeInstances} icon={Activity} />
        <MetricTile label="Open user tasks" value={tasks.length} icon={ClipboardList} />
        <MetricTile label="Deployments" value={deployments.length} icon={Database} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[3px] border bg-white">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold text-slate-900">Latest processes</h3>
          </div>
          <div className="divide-y">
            {definitions.length === 0 ? (
              <div className="px-4 py-10 text-sm text-slate-500">No deployed process yet.</div>
            ) : (
              definitions.slice(0, 8).map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  onClick={onOpenProcesses}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {definition.name || definition.key}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-500">{definition.key}</p>
                  </div>
                  <Badge variant="secondary">v{definition.version}</Badge>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="h-12 w-full justify-start rounded-[3px] bg-[#0f5b6b] hover:bg-[#0d4d5b]"
            onClick={onOpenProcesses}
          >
            <ListTree className="size-4" />
            Manage processes
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-[3px]"
            onClick={onOpenInstances}
          >
            <Activity className="size-4" />
            Monitor process instances
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-[3px]"
            onClick={onOpenTasks}
          >
            <ClipboardList className="size-4" />
            Work on user tasks
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkflowNavButton({
  item,
  active,
  onClick,
}: {
  item: MenuItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-[3px] border px-3 text-sm font-semibold transition',
        active
          ? 'border-[#0f5b6b] bg-[#0f5b6b] text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function WorkflowControlCenter() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<FlowsetSection>('modeler');
  const [selectedProcessKey, setSelectedProcessKey] = useState('');

  const definitionsQuery = useQuery({
    queryKey: ['workflow-definitions'],
    queryFn: listWorkflowDefinitions,
  });

  const definitions = definitionsQuery.data ?? [];
  const meta = SECTION_META[section];
  const HeaderIcon = meta.icon;

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
    void queryClient.invalidateQueries({ queryKey: ['workflow-deployments'] });
    void queryClient.invalidateQueries({ queryKey: ['process-instances'] });
    void queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
  };

  const openProcessInModeler = (processKey: string) => {
    setSelectedProcessKey(processKey);
    setSection('modeler');
  };

  return (
    <div className="flex h-[calc(100vh-132px)] min-h-[640px] flex-col overflow-hidden rounded-md border bg-white">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="icon" className="size-9 rounded-[3px]">
              <Menu className="size-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-3 border-r pr-4">
              <Workflow className="size-7 text-[#0f5b6b]" />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-950">Flowset Control</p>
                <p className="truncate text-xs text-[#0f5b6b]">MSS301 Petclinic</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <HeaderIcon className="size-5 text-[#0f5b6b]" />
              <h1 className="truncate text-xl font-bold text-slate-950">{meta.title}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="h-8 gap-2 rounded-[3px] px-3 text-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              Petclinic Engine
            </Badge>
            <Badge variant="secondary" className="h-8 rounded-[3px] px-3">
              Camunda 8
            </Badge>
            <Button
              variant="outline"
              className="h-9 rounded-[3px]"
              onClick={refreshAll}
              disabled={definitionsQuery.isFetching}
            >
              <RefreshCw className={cn('size-4', definitionsQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </header>

        <nav className="flex h-12 shrink-0 items-center gap-4 overflow-x-auto border-b bg-slate-50 px-3">
          {MENU_GROUPS.map((group) => (
            <div key={group.label} className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-bold text-[#0f5b6b]">{group.label}</span>
              {group.items.map((item) => (
                <WorkflowNavButton
                  key={item.id}
                  item={item}
                  active={section === item.id}
                  onClick={() => setSection(item.id)}
                />
              ))}
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'min-h-0 flex-1 bg-[#f7f8fa]',
            section === 'instances' ? 'overflow-hidden' : 'overflow-auto',
            section === 'modeler' ? 'p-0' : section === 'instances' ? 'p-2' : 'p-4',
          )}
        >
          {section === 'dashboard' && (
            <DashboardPanel
              definitions={definitions}
              onOpenProcesses={() => setSection('processes')}
              onOpenInstances={() => setSection('instances')}
              onOpenTasks={() => setSection('tasks')}
            />
          )}

          {section === 'modeler' && (
            <WorkflowDesigner
              chrome="flowset"
              processKey={selectedProcessKey}
              onProcessKeyChange={setSelectedProcessKey}
              onDeployed={refreshAll}
            />
          )}

          {section === 'processes' && <ProcessDefinitionList onLoad={openProcessInModeler} />}
          {section === 'instances' && <ProcessInstancesTab />}
          {section === 'tasks' && <UserTasksTab />}
          {section === 'deployments' && <DeploymentList />}

          {section === 'incidents' && (
            <EmptyModule title="Incidents">
              Incident management will be backed by the Camunda 8 incident search API. Current
              process incidents are still visible from Process instances.
            </EmptyModule>
          )}
          {section === 'decisions' && (
            <EmptyModule title="Decisions">
              DMN decision management is reserved for the next workflow increment.
            </EmptyModule>
          )}
          {section === 'engines' && (
            <EmptyModule title="BPM engines">
              Petclinic Engine is configured against local Camunda 8 and exposed through the
              workflow-service API.
            </EmptyModule>
          )}
          {section === 'users' && (
            <EmptyModule title="Users">
              User administration remains owned by Petclinic auth-service.
            </EmptyModule>
          )}
          {section === 'roles' && (
            <EmptyModule title="Roles">
              Role administration remains owned by Petclinic auth-service.
            </EmptyModule>
          )}
          {section === 'about' && (
            <EmptyModule title="Flowset-style Workflow Control">
              This screen mirrors Flowset Control navigation while running on Spring Boot 4,
              Camunda 8, and the Petclinic workflow-service.
            </EmptyModule>
          )}
        </div>
    </div>
  );
}
