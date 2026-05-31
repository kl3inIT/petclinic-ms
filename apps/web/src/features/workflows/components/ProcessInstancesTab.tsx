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
  Trash2,
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
  deleteWorkflowInstance,
  listProcessInstances,
  terminateWorkflowInstance,
  type ProcessInstanceSummary,
} from '@/features/workflows/api';
import { InstanceMonitor } from '@/features/workflows/components/InstanceMonitor';

type InstanceMode = 'ALL' | 'ACTIVE' | 'COMPLETED';
const FINAL_STATES = new Set(['COMPLETED', 'TERMINATED', 'CANCELED']);

const STATE_BADGE: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  ACTIVE: {
    label: 'Đang chạy',
    className: 'border-sky-300 bg-sky-50 text-sky-700',
    icon: <Activity className="size-3" />,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    icon: <CheckCircle2 className="size-3" />,
  },
  CANCELED: {
    label: 'Đã hủy',
    className: 'border-slate-300 bg-muted/40 text-slate-600',
    icon: <XCircle className="size-3" />,
  },
  INCIDENT: {
    label: 'Sự cố',
    className: 'border-red-300 bg-red-50 text-red-700',
    icon: <AlertTriangle className="size-3" />,
  },
};

function StateBadge({ state }: { state: string }) {
  const cfg = STATE_BADGE[state] ?? {
    label: state,
    className: 'border-slate-300 bg-muted/40 text-slate-600',
    icon: null,
  };
  return (
    <Badge
      variant="outline"
      className={cn('flex w-fit items-center gap-1 rounded-md', cfg.className)}
    >
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
  const label: Record<InstanceMode, string> = {
    ALL: 'Tất cả',
    ACTIVE: 'Đang chạy',
    COMPLETED: 'Hoàn thành',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 border px-4 text-sm font-medium transition first:rounded-l-md last:rounded-r-md',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {label[mode]}
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
  const {
    data: instances = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['process-instances', mode],
    queryFn: () => listProcessInstances(undefined, stateParam),
    refetchInterval: mode !== 'COMPLETED' ? 5000 : false,
  });

  const filteredInstances = useMemo(
    () =>
      instances.filter((instance) => {
        const process =
          instance.processDefinitionId ?? instance.processDefinitionKey ?? '';
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
    selectedItems.length > 0 &&
    selectedItems.every(
      (instance) => instance.state === 'ACTIVE' || instance.state === 'INCIDENT',
    );
  const canDelete =
    selectedItems.length > 0 &&
    selectedItems.every((instance) => FINAL_STATES.has(instance.state));

  const terminateMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      await Promise.all(keys.map((key) => terminateWorkflowInstance(key)));
    },
    onSuccess: (_, keys) => {
      toast.success(`Đã hủy ${keys.length} lượt chạy`);
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Hủy lượt chạy thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      await Promise.all(keys.map((key) => deleteWorkflowInstance(key)));
    },
    onSuccess: (_, keys) => {
      toast.success(`Đã xóa dữ liệu ${keys.length} lượt chạy`);
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Xóa lượt chạy thất bại'),
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
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background p-1">
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
          {filteredInstances.length} / {instances.length} lượt chạy
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border bg-muted/40 px-3 py-2">
        <Button
          className="h-9 rounded-md bg-emerald-600 hover:bg-emerald-700"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          Làm mới
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-md"
          disabled={!canTerminate || terminateMutation.isPending}
          onClick={() =>
            terminateMutation.mutate(selectedItems.map((item) => item.processInstanceKey))
          }
        >
          <CircleDot className="size-4" />
          Hủy
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-md"
          disabled={!canDelete || deleteMutation.isPending}
          title="Chỉ xóa được lượt chạy đã hoàn thành hoặc đã hủy."
          onClick={() => {
            const keys = selectedItems.map((item) => item.processInstanceKey);
            const ok = window.confirm(
              `Xóa dữ liệu lịch sử của ${keys.length} lượt chạy đã chọn?`,
            );
            if (ok) deleteMutation.mutate(keys);
          }}
        >
          <Trash2 className="size-4" />
          {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa dữ liệu'}
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-md"
          disabled
          title="Camunda 8 không hỗ trợ tạm dừng lượt chạy theo kiểu Camunda 7."
        >
          <Pause className="size-4" />
          Tạm dừng
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-md"
          disabled
          title="Camunda 8 không hỗ trợ kích hoạt lượt chạy theo kiểu Camunda 7."
        >
          <Play className="size-4" />
          Kích hoạt
        </Button>
        {selectedItems.length > 0 && (
          <Badge variant="secondary" className="ml-auto rounded-md">
            Đã chọn {selectedItems.length}
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
                  aria-label="Chọn tất cả lượt chạy đang hiển thị"
                />
              </TableHead>
              <TableHead className="min-w-[230px]">ID</TableHead>
              <TableHead className="min-w-[220px]">Quy trình</TableHead>
              <TableHead className="min-w-[150px]">Khóa nghiệp vụ</TableHead>
              <TableHead className="min-w-[130px]">Trạng thái</TableHead>
              <TableHead className="min-w-[190px]">Bắt đầu</TableHead>
              <TableHead className="min-w-[190px]">Kết thúc</TableHead>
              <TableHead className="w-[70px] text-right">Xem</TableHead>
            </TableRow>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead />
              <TableHead>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-2 size-3.5 text-slate-400" />
                  <Input
                    value={filters.id}
                    onChange={(event) => setFilter('id', event.target.value)}
                    className="h-8 rounded-md pl-7 text-xs"
                    placeholder="Lọc ID"
                  />
                </div>
              </TableHead>
              <TableHead>
                <Input
                  value={filters.process}
                  onChange={(event) => setFilter('process', event.target.value)}
                  className="h-8 rounded-md text-xs"
                  placeholder="Lọc quy trình"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.businessKey}
                  onChange={(event) => setFilter('businessKey', event.target.value)}
                  className="h-8 rounded-md text-xs"
                  placeholder="Lọc khóa nghiệp vụ"
                  disabled
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.state}
                  onChange={(event) => setFilter('state', event.target.value)}
                  className="h-8 rounded-md text-xs"
                  placeholder="Lọc trạng thái"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.startTime}
                  onChange={(event) => setFilter('startTime', event.target.value)}
                  className="h-8 rounded-md text-xs"
                  placeholder="Lọc bắt đầu"
                />
              </TableHead>
              <TableHead>
                <Input
                  value={filters.endTime}
                  onChange={(event) => setFilter('endTime', event.target.value)}
                  className="h-8 rounded-md text-xs"
                  placeholder="Lọc kết thúc"
                />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-40 text-center text-sm text-slate-500"
                >
                  Đang tải lượt chạy...
                </TableCell>
              </TableRow>
            ) : filteredInstances.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-52 text-center text-sm text-slate-500"
                >
                  Không tìm thấy lượt chạy.
                </TableCell>
              </TableRow>
            ) : (
              filteredInstances.map((instance: ProcessInstanceSummary) => {
                const process =
                  instance.processDefinitionId ?? instance.processDefinitionKey ?? '';
                return (
                  <TableRow
                    key={instance.processInstanceKey}
                    data-state={
                      selected.has(instance.processInstanceKey) ? 'selected' : undefined
                    }
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(instance.processInstanceKey)}
                        onChange={() => toggleOne(instance.processInstanceKey)}
                        aria-label={`Chọn lượt chạy ${instance.processInstanceKey}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setMonitorKey(instance.processInstanceKey)}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        {instance.processInstanceKey}
                      </button>
                      {instance.hasIncident && (
                        <AlertTriangle className="ml-1.5 inline size-3 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {process || '-'}
                        </p>
                        <p className="text-xs text-slate-500">
                          v{instance.processDefinitionVersion}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">-</TableCell>
                    <TableCell>
                      <StateBadge state={instance.state} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-pre-line text-slate-600">
                      {formatDate(instance.startDate) || '-'}
                    </TableCell>
                    <TableCell className="text-xs whitespace-pre-line text-slate-600">
                      {formatDate(instance.endDate) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-md"
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
