import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, RefreshCw, Rocket, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  deleteWorkflowDefinition,
  listWorkflowDefinitions,
  startWorkflow,
  type WorkflowDefinitionSummary,
} from '@/features/workflows/api';

interface ProcessDefinitionListProps {
  onLoad: (processKey: string) => void;
}

function includes(value: string | undefined, query: string) {
  if (!query.trim()) return true;
  return (value ?? '').toLowerCase().includes(query.trim().toLowerCase());
}

function latestOnly(definitions: WorkflowDefinitionSummary[]) {
  const byKey = new Map<string, WorkflowDefinitionSummary>();
  definitions.forEach((definition) => {
    const current = byKey.get(definition.key);
    if (!current || definition.version > current.version) {
      byKey.set(definition.key, definition);
    }
  });
  return Array.from(byKey.values());
}

export function ProcessDefinitionList({ onLoad }: ProcessDefinitionListProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    name: '',
    key: '',
    state: 'ALL',
    latestOnly: true,
  });

  const {
    data: definitions = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['workflow-definitions'],
    queryFn: listWorkflowDefinitions,
  });

  const filteredDefinitions = useMemo(() => {
    const base = filters.latestOnly ? latestOnly(definitions) : definitions;
    return base.filter((definition) => {
      const state = definition.suspended ? 'SUSPENDED' : 'ACTIVE';
      return (
        includes(definition.name || definition.key, filters.name) &&
        includes(definition.key, filters.key) &&
        (filters.state === 'ALL' || filters.state === state)
      );
    });
  }, [definitions, filters]);

  const startMutation = useMutation({
    mutationFn: (key: string) => startWorkflow(key, {}),
    onSuccess: (result) => {
      toast.success(
        `Đã chạy quy trình: ${result.bpmnProcessId ?? result.processDefinitionKey ?? result.processInstanceKey}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      void queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Không thể chạy quy trình'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      await Promise.all(keys.map((key) => deleteWorkflowDefinition(key)));
    },
    onSuccess: (_, keys) => {
      toast.success(`Đã gửi yêu cầu xóa ${keys.length} phiên bản quy trình`);
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-deployments'] });
      void queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-dashboard'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Không thể xóa quy trình'),
  });

  const allVisibleSelected =
    filteredDefinitions.length > 0 &&
    filteredDefinitions.every((definition) => selected.has(definition.id));

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredDefinitions.forEach((definition) => next.delete(definition.id));
      } else {
        filteredDefinitions.forEach((definition) => next.add(definition.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-3 bg-white p-1">
      <div className="border bg-muted/40 p-3">
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Bộ lọc
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_180px_auto]">
            <div className="space-y-1">
              <Label className="text-xs">Tên chứa</Label>
              <Input
                value={filters.name}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, name: event.target.value }))
                }
                className="h-9 rounded-md"
                placeholder="Nhập tên"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mã chứa</Label>
              <Input
                value={filters.key}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, key: event.target.value }))
                }
                className="h-9 rounded-md"
                placeholder="Nhập mã"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Trạng thái</Label>
              <Select
                value={filters.state}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, state: value }))
                }
              >
                <SelectTrigger className="h-9 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="SUSPENDED">Tạm dừng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={filters.latestOnly}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    latestOnly: event.target.checked,
                  }))
                }
              />
              Chỉ phiên bản mới nhất
            </label>
            <div className="flex items-end gap-2">
              <Button className="h-9 rounded-md bg-primary hover:bg-primary/90">
                <Search className="size-4" />
                Áp dụng
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-md"
                onClick={() =>
                  setFilters({ name: '', key: '', state: 'ALL', latestOnly: true })
                }
              >
                <X className="size-4" />
                Xóa
              </Button>
            </div>
          </div>
        </details>
      </div>

      <div className="flex flex-wrap items-center gap-2 border bg-muted/40 px-3 py-2">
        <Button
          className="h-9 rounded-md bg-emerald-600 hover:bg-emerald-700"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
        <Button
          className="h-9 rounded-md bg-primary hover:bg-primary/90"
          onClick={() => onLoad('')}
        >
          <Rocket className="size-4" />
          Tải BPMN XML
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-md"
          disabled={selected.size === 0 || deleteMutation.isPending}
          onClick={() => {
            const keys = Array.from(selected);
            const ok = window.confirm(
              `Xóa ${keys.length} phiên bản quy trình đã chọn? Các lượt chạy đang hoạt động phải được hủy trước.`,
            );
            if (ok) deleteMutation.mutate(keys);
          }}
        >
          <Trash2 className="size-4" />
          {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
        </Button>
        <span className="ml-auto text-sm text-slate-500">
          {filteredDefinitions.length} quy trình
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Chọn tất cả quy trình đang hiển thị"
                />
              </TableHead>
              <TableHead className="min-w-[260px]">Tên</TableHead>
              <TableHead className="min-w-[240px]">Mã</TableHead>
              <TableHead className="w-[90px]">Phiên bản</TableHead>
              <TableHead className="w-[120px]">Trạng thái</TableHead>
              <TableHead className="w-[190px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 text-center text-sm text-slate-500"
                >
                  Đang tải quy trình...
                </TableCell>
              </TableRow>
            ) : filteredDefinitions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-52 text-center text-sm text-slate-500"
                >
                  Chưa có quy trình được deploy.
                </TableCell>
              </TableRow>
            ) : (
              filteredDefinitions.map((definition) => (
                <TableRow key={definition.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(definition.id)}
                      onChange={() => toggleOne(definition.id)}
                      aria-label={`Chọn quy trình ${definition.key}`}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onLoad(definition.key)}
                      className="text-left font-semibold text-primary hover:underline"
                    >
                      {definition.name || definition.key}
                    </button>
                    {definition.resourceName && (
                      <p className="text-xs text-slate-500">{definition.resourceName}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{definition.key}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-md">
                      v{definition.version}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {definition.suspended ? (
                      <Badge
                        variant="outline"
                        className="rounded-md border-amber-300 text-amber-700"
                      >
                        Tạm dừng
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-md border-emerald-300 text-emerald-700"
                      >
                        Hoạt động
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        className="rounded-md bg-primary hover:bg-primary/90"
                        onClick={() => startMutation.mutate(definition.key)}
                        disabled={definition.suspended || startMutation.isPending}
                      >
                        <Play className="size-3.5" />
                        {startMutation.isPending ? 'Đang chạy...' : 'Chạy'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
