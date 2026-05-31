import { type ComponentType, type ReactNode, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Database,
  Grid2X2,
  LayoutDashboard,
  ListTree,
  PencilRuler,
  Plus,
  RefreshCw,
  Workflow,
  X,
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
  | 'deployments';

type MenuItem = {
  id: FlowsetSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ModelerTab = {
  id: string;
  processKey: string;
  title: string;
};

const MENU_GROUPS: Array<{ items: MenuItem[] }> = [
  {
    items: [
      { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'modeler', label: 'Thiết kế', icon: PencilRuler },
      { id: 'processes', label: 'Quy trình', icon: ListTree },
      { id: 'instances', label: 'Lượt chạy', icon: Activity },
      { id: 'incidents', label: 'Sự cố', icon: AlertTriangle },
      { id: 'tasks', label: 'Việc người dùng', icon: ClipboardList },
    ],
  },
  {
    items: [{ id: 'decisions', label: 'Quyết định', icon: Grid2X2 }],
  },
  {
    items: [{ id: 'deployments', label: 'Bản deploy', icon: Database }],
  },
];

const SECTION_META: Record<
  FlowsetSection,
  { title: string; icon: ComponentType<{ className?: string }> }
> = {
  dashboard: { title: 'Tổng quan', icon: LayoutDashboard },
  modeler: { title: 'Thiết kế BPMN', icon: PencilRuler },
  processes: { title: 'Quy trình', icon: ListTree },
  instances: { title: 'Lượt chạy quy trình', icon: Activity },
  incidents: { title: 'Sự cố', icon: AlertTriangle },
  tasks: { title: 'Việc người dùng', icon: ClipboardList },
  decisions: { title: 'Quyết định', icon: Grid2X2 },
  deployments: { title: 'Bản deploy', icon: Database },
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
        <Icon className="size-5 text-primary" />
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
        <MetricTile
          label="Định nghĩa quy trình"
          value={definitions.length}
          icon={ListTree}
        />
        <MetricTile
          label="Lượt chạy đang hoạt động"
          value={activeInstances}
          icon={Activity}
        />
        <MetricTile
          label="Việc người dùng đang mở"
          value={tasks.length}
          icon={ClipboardList}
        />
        <MetricTile label="Bản deploy" value={deployments.length} icon={Database} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[3px] border bg-white">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold text-slate-900">Quy trình mới nhất</h3>
          </div>
          <div className="divide-y">
            {definitions.length === 0 ? (
              <div className="px-4 py-10 text-sm text-slate-500">
                Chưa có quy trình được deploy.
              </div>
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
                    <p className="truncate font-mono text-xs text-slate-500">
                      {definition.key}
                    </p>
                  </div>
                  <Badge variant="secondary">v{definition.version}</Badge>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="h-12 w-full justify-start rounded-[3px] bg-primary hover:bg-primary/90"
            onClick={onOpenProcesses}
          >
            <ListTree className="size-4" />
            Quản lý quy trình
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-[3px]"
            onClick={onOpenInstances}
          >
            <Activity className="size-4" />
            Theo dõi lượt chạy
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full justify-start rounded-[3px]"
            onClick={onOpenTasks}
          >
            <ClipboardList className="size-4" />
            Xử lý việc người dùng
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
        'flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function newTabId(processKey: string) {
  return `${processKey || 'new'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WorkflowControlCenter() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<FlowsetSection>('modeler');
  const [modelerTabs, setModelerTabs] = useState<ModelerTab[]>([
    { id: newTabId(''), processKey: '', title: 'Quy trình mới' },
  ]);
  const [activeModelerTabId, setActiveModelerTabId] = useState<string | null>(null);
  const activeTabId = activeModelerTabId ?? modelerTabs[0]?.id ?? '';

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
    if (!processKey) {
      const tab = { id: newTabId(''), processKey: '', title: 'Quy trình mới' };
      setModelerTabs((current) => [...current, tab]);
      setActiveModelerTabId(tab.id);
      setSection('modeler');
      return;
    }

    const existing = modelerTabs.find((tab) => tab.processKey === processKey);
    if (existing) {
      setActiveModelerTabId(existing.id);
      setSection('modeler');
      return;
    }

    const tab = { id: newTabId(processKey), processKey, title: processKey };
    setModelerTabs((current) => [...current, tab]);
    setActiveModelerTabId(tab.id);
    setSection('modeler');
  };

  const updateModelerTabKey = (tabId: string, processKey: string) => {
    setModelerTabs((current) =>
      current.map((tab) =>
        tab.id === tabId
          ? { ...tab, processKey, title: processKey || 'Quy trình mới' }
          : tab,
      ),
    );
  };

  const closeModelerTab = (tabId: string) => {
    setModelerTabs((current) => {
      if (current.length === 1) {
        const replacement = { id: newTabId(''), processKey: '', title: 'Quy trình mới' };
        setActiveModelerTabId(replacement.id);
        return [replacement];
      }

      const index = current.findIndex((tab) => tab.id === tabId);
      const next = current.filter((tab) => tab.id !== tabId);
      if (activeTabId === tabId) {
        const fallback = next[Math.max(0, index - 1)] ?? next[0];
        if (fallback) {
          setActiveModelerTabId(fallback.id);
        }
      }
      return next;
    });
  };

  const openBlankModelerTab = () => {
    const tab = { id: newTabId(''), processKey: '', title: 'Quy trình mới' };
    setModelerTabs((current) => [...current, tab]);
    setActiveModelerTabId(tab.id);
    setSection('modeler');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[3px] border bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Workflow className="size-5 shrink-0 text-primary" />
          <div className="flex min-w-0 items-center gap-2 border-r pr-3">
            <span className="truncate text-base font-semibold">Quản lý Workflow</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <HeaderIcon className="size-4 shrink-0 text-muted-foreground" />
            <h1 className="truncate text-base font-medium text-muted-foreground">
              {meta.title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="h-7 gap-1.5 px-2 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Petclinic Engine
          </Badge>
          <Badge variant="secondary" className="h-7 px-2 text-xs">
            Camunda 8
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={definitionsQuery.isFetching}
          >
            <RefreshCw
              className={cn('size-4', definitionsQuery.isFetching && 'animate-spin')}
            />
            Làm mới
          </Button>
        </div>
      </header>

      <nav className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b bg-muted/40 px-2">
        {MENU_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="flex shrink-0 items-center gap-1.5">
            {groupIndex > 0 && <div className="mx-1 h-5 w-px bg-slate-300" />}
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
          'min-h-0 flex-1 bg-muted/20',
          section === 'instances' ? 'overflow-hidden' : 'overflow-auto',
          section === 'modeler' ? 'p-0' : section === 'instances' ? 'p-1' : 'p-3',
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
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b bg-muted/40 px-2">
              {modelerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModelerTabId(tab.id)}
                  className={cn(
                    'group flex h-8 max-w-[240px] shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium',
                    activeTabId === tab.id
                      ? 'border-primary bg-background text-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:bg-background',
                  )}
                  title={tab.title}
                >
                  <span className="truncate">{tab.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="rounded p-0.5 opacity-70 hover:bg-muted hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeModelerTab(tab.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        closeModelerTab(tab.id);
                      }
                    }}
                  >
                    <X className="size-3.5" />
                  </span>
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0"
                onClick={openBlankModelerTab}
              >
                <Plus className="size-4" />
                Tab mới
              </Button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {modelerTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={cn(
                    'absolute inset-0 min-h-0',
                    activeTabId === tab.id ? 'block' : 'hidden',
                  )}
                >
                  <WorkflowDesigner
                    chrome="flowset"
                    processKey={tab.processKey}
                    active={activeTabId === tab.id}
                    onProcessKeyChange={(processKey) =>
                      updateModelerTabKey(tab.id, processKey)
                    }
                    onDeployed={refreshAll}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'processes' && (
          <ProcessDefinitionList onLoad={openProcessInModeler} />
        )}
        {section === 'instances' && <ProcessInstancesTab />}
        {section === 'tasks' && <UserTasksTab />}
        {section === 'deployments' && <DeploymentList />}

        {section === 'incidents' && (
          <EmptyModule title="Sự cố">
            Quản lý sự cố sẽ dùng API tìm kiếm incident của Camunda 8. Hiện tại sự cố vẫn
            xem được trong màn hình lượt chạy quy trình.
          </EmptyModule>
        )}
        {section === 'decisions' && (
          <EmptyModule title="Quyết định">
            Quản lý quyết định DMN sẽ được bổ sung ở bước tiếp theo.
          </EmptyModule>
        )}
      </div>
    </div>
  );
}
