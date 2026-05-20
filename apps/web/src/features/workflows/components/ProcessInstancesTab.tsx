import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Eye,
  Pause,
  Play,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  listProcessInstances,
  terminateWorkflowInstance,
  type ProcessInstanceSummary,
} from '@/features/workflows/api';
import { InstanceMonitor } from '@/features/workflows/components/InstanceMonitor';

type InstanceMode = 'ALL' | 'ACTIVE' | 'COMPLETED';

const STATE_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: 'Active',
    className: 'border-sky-300 bg-sky-50 text-sky-700',
    icon: <Activity className="size-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="size-3" />,
  },
  CANCELED: {
    label: 'Canceled',
    className: 'border-slate-300 bg-slate-50 text-slate-600',
    icon: <XCircle className="size-3" />,
  },
  INCIDENT: {
    label: 'Incident',
    className: 'border-red-300 bg-red-50 text-red-700',
    icon: <AlertTriangle className="size-3" />,
  },
};

function StateBadge({ state }: { state: string }) {
  const cfg = STATE_BADGE[state] ?? {
    label: state,
    className: 'border-slate-300 bg-slate-50 text-slate-600',
    icon: null,
  };
  return (
    <Badge variant="outline" className={cn('flex w-fit items-center gap-1 rounded-[3px]', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function includes(value: string | undefined, query: string) {
  if (!query.trim()) return true;
  return (value ?? '').toLowerCase().includes(query.trim().toLowerCase());
}

function FlowsetModeButton({
  mode,
  active,
  onClick,
}: {
  mode: InstanceMode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 border px-4 text-sm font-semibold transition first:rounded-l-[3px] last:rounded-r-[3px]',
        active
          ? 'border-[#0f5b6b] bg-[#0f5b6b] text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {mode}
    </button>
  );
}

export function ProcessInstancesTab() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<InstanceMode>('ACTIVE');
  const [monitorKey, setMonitorKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    id: '',
    process: '',
    businessKey: '',
    state: '',
    startTime: '',
    endTime: '',
  });

  const stateParam = mode === 'ALL' ? undefined : mode;
  const { data: instances = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['process-instances', mode],
    queryFn: () => listProcessInstances(undefined, stateParam),
    refetchInterval: mode !== 'COMPLETED' ? 5000 : false,
  });

  const filteredInstances = useMemo(
    () =>
      instances.filter((instance) => {
        const process = instance.processDefinitionId ?? instance.processDefinitionKey ?? '';
        return (
          includes(instance.processInstanceKey, filters.id) &&
          includes(process, filters.process) &&
          includes('', filters.businessKey) &&
          includes(instance.state, filters.state) &&
          includes(formatDate(instance.startDate), filters.startTime) &&
          includes(formatDate(instance.endDate), filters.endTime)
        );
      }),
    [filters, instances],
  );

  const selectedItems = useMemo(
    () => instances.filter((instance) => selected.has(instance.processInstanceKey)),
    [instances, selected],
  );
  const canTerminate =
    selectedItems.length > 0 && selectedItems.every((instance) => instance.state === 'ACTIVE' || instance.state === 'INCIDENT');

  const terminateMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      await Promise.all(keys.map((key) => terminateWorkflowInstance(key)));
    },
    onSuccess: (_, keys) => {
      toast.success(`Terminated ${keys.length} process instance${keys.length === 1 ? '' : 's'}`);
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Terminate failed'),
  });

  const allVisibleSelected =
    filteredInstances.length > 0 &&
    filteredInstances.every((instance) => selected.has(instance.processInstanceKey));

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredInstances.forEach((instance) => next.delete(instance.processInstanceKey));
      } else {
        filteredInstances.forEach((instance) => next.add(instance.processInstanceKey));
      }
      return next;
    });
  };

  const toggleOne = (key: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (monitorKey) {
    return (
      <div className="h-full min-h-0 overflow-hidden bg-white">
        <InstanceMonitor
          instanceKey={monitorKey}
          open
          onClose={() => setMonitorKey(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-white p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((item) => (
            <FlowsetModeButton
              key={item}
              mode={item}
              active={mode === item}
              onClick={() => {
                setMode(item);
                setSelected(new Set());
              }}
            />
          ))}
        </div>

        <p className="text-sm text-slate-500">
          {filteredInstances.length} of {instances.length} process instance{instances.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border bg-slate-50 px-3 py-2">
        <Button
          className="h-9 rounded-[3px] bg-emerald-600 hover:bg-emerald-700"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-[3px]"
          disabled={!canTerminate || terminateMutation.isPending}
          onClick={() => terminateMutation.mutate(selectedItems.map((item) => item.processInstanceKey))}
        >
          <CircleDot className="size-4" />
          Terminate
        </Button>
        <Button variant="outline" className="h-9 rounded-[3px]" disabled title="Camunda 8 does not support Camunda 7-style instance suspend.">
          <Pause className="size-4" />
          Suspend
        </Button>
        <Button variant="outline" className="h-9 rounded-[3px]" disabled title="Camunda 8 does not support Camunda 7-style instance activate.">
          <Play className="size-4" />
          Activate
        </Button>
        {selectedItems.length > 0 && (
          <Badge variant="secondary" className="ml-auto rounded-[3px]">
            {selectedItems.length} selected
          </Badge>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="bg-white">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all visible process instances"
                />
              </TableHead>
              <TableHead className="min-w-[230px]">Id</TableHead>
              <TableHead className="min-w-[220px]">Process</TableHead>
              <TableHead className="min-w-[150px]">Business key</TableHead>
              <TableHead className="min-w-[130px]">State</TableHead>
              <TableHead className="min-w-[190px]">Start time</TableHead>
              <TableHead className="min-w-[190px]">End time</TableHead>
              <TableHead className="w-[70px] text-right">View</TableHead>
            </TableRow>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead />
              <TableHead>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 size-3.5 text-slate-400" />
                  <Input
                    value={filters.id}
                    onChange={(event) => setFilter('id', event.target.value)}
                    className="h-8 rounded-[3px] pl-7 text-xs"
                    placeholder="Filter id"
                  />
                </div>
              </TableHead>
              <TableHead>
                <Input
                  value={filters.process}
                  onChange={(event) => setFilter('process', event.target.value)}
                  className="h-8 rounded-[3px] text-xs"
                  placeholder="Filter process"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.businessKey}
                  onChange={(event) => setFilter('businessKey', event.target.value)}
                  className="h-8 rounded-[3px] text-xs"
                  placeholder="Filter business key"
                  disabled
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.state}
                  onChange={(event) => setFilter('state', event.target.value)}
                  className="h-8 rounded-[3px] text-xs"
                  placeholder="Filter state"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.startTime}
                  onChange={(event) => setFilter('startTime', event.target.value)}
                  className="h-8 rounded-[3px] text-xs"
                  placeholder="Filter start"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.endTime}
                  onChange={(event) => setFilter('endTime', event.target.value)}
                  className="h-8 rounded-[3px] text-xs"
                  placeholder="Filter end"
                />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center text-sm text-slate-500">
                  Loading process instances...
                </TableCell>
              </TableRow>
            ) : filteredInstances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-52 text-center text-sm text-slate-500">
                  No process instances found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInstances.map((instance: ProcessInstanceSummary) => {
                const process = instance.processDefinitionId ?? instance.processDefinitionKey ?? '';
                return (
                  <TableRow
                    key={instance.processInstanceKey}
                    data-state={selected.has(instance.processInstanceKey) ? 'selected' : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(instance.processInstanceKey)}
                        onChange={() => toggleOne(instance.processInstanceKey)}
                        aria-label={`Select process instance ${instance.processInstanceKey}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setMonitorKey(instance.processInstanceKey)}
                        className="font-mono text-xs font-semibold text-[#0f5b6b] hover:underline"
                      >
                        {instance.processInstanceKey}
                      </button>
                      {instance.hasIncident && (
                        <AlertTriangle className="ml-1.5 inline size-3 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{process || '-'}</p>
                        <p className="text-xs text-slate-500">v{instance.processDefinitionVersion}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">-</TableCell>
                    <TableCell>
                      <StateBadge state={instance.state} />
                    </TableCell>
                    <TableCell className="whitespace-pre-line text-xs text-slate-600">
                      {formatDate(instance.startDate) || '-'}
                    </TableCell>
                    <TableCell className="whitespace-pre-line text-xs text-slate-600">
                      {formatDate(instance.endDate) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-[3px]"
                        onClick={() => setMonitorKey(instance.processInstanceKey)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
