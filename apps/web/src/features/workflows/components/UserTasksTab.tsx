import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  ClipboardList,
  Filter,
  RefreshCw,
  Repeat2,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';

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
import { listUserTasks, type UserTask } from '@/features/workflows/api';
import { UserTaskDialog } from '@/features/workflows/components/UserTaskDialog';

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function includes(value: string | undefined, query: string) {
  if (!query.trim()) return true;
  return (value ?? '').toLowerCase().includes(query.trim().toLowerCase());
}

function TaskTypeBadge({ elementId }: { elementId?: string }) {
  if (elementId === 'ConfirmByDoctor') {
    return (
      <Badge
        variant="outline"
        className="rounded-md border-violet-300 text-[10px] text-violet-700"
      >
        <Stethoscope className="mr-1 size-2.5" />
        Bác sĩ xác nhận
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-md border-slate-300 text-[10px] text-slate-600"
    >
      <ClipboardList className="mr-1 size-2.5" />
      Việc người dùng
    </Badge>
  );
}

export function UserTasksTab() {
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(true);
  const [filters, setFilters] = useState({
    taskKey: '',
    taskName: '',
    processDefinition: '',
    state: 'CREATED',
    assignment: 'ALL',
    assignee: '',
    createdAfter: '',
    createdBefore: '',
  });

  const {
    data: tasks = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['user-tasks', filters.state],
    queryFn: () =>
      listUserTasks(undefined, filters.state === 'ALL' ? undefined : filters.state),
    refetchInterval:
      filters.state === 'CREATED' || filters.state === 'ALL' ? 5000 : false,
  });

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const created = task.creationDate ? new Date(task.creationDate).getTime() : 0;
        const createdAfter = filters.createdAfter
          ? new Date(filters.createdAfter).getTime()
          : null;
        const createdBefore = filters.createdBefore
          ? new Date(filters.createdBefore).getTime()
          : null;
        const assignmentMatches =
          filters.assignment === 'ALL' ||
          (filters.assignment === 'ASSIGNED' && !!task.assignee) ||
          (filters.assignment === 'UNASSIGNED' && !task.assignee);
        return (
          includes(task.elementId, filters.taskKey) &&
          includes(task.name, filters.taskName) &&
          includes(
            task.processDefinitionId ?? task.processDefinitionKey,
            filters.processDefinition,
          ) &&
          assignmentMatches &&
          includes(task.assignee, filters.assignee) &&
          (createdAfter === null || created >= createdAfter) &&
          (createdBefore === null || created <= createdBefore)
        );
      }),
    [filters, tasks],
  );

  const appliedFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'state') return value !== 'CREATED';
    if (key === 'assignment') return value !== 'ALL';
    return Boolean(value);
  }).length;

  const allVisibleSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((task) => selected.has(task.userTaskKey));

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        filteredTasks.forEach((task) => next.delete(task.userTaskKey));
      } else {
        filteredTasks.forEach((task) => next.add(task.userTaskKey));
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

  return (
    <div className="flex h-full min-h-[640px] gap-3 bg-background p-1">
      {filterOpen && (
        <aside className="w-[310px] shrink-0 overflow-auto border bg-muted/40 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Bộ lọc việc</h3>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-md"
                onClick={() => refetch()}
              >
                <Search className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-md text-red-600"
                onClick={() =>
                  setFilters({
                    taskKey: '',
                    taskName: '',
                    processDefinition: '',
                    state: 'CREATED',
                    assignment: 'ALL',
                    assignee: '',
                    createdAfter: '',
                    createdBefore: '',
                  })
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <details open className="mb-3">
            <summary className="cursor-pointer text-sm font-semibold">Chung</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã việc chứa</Label>
                <Input
                  value={filters.taskKey}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, taskKey: event.target.value }))
                  }
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tên việc chứa</Label>
                <Input
                  value={filters.taskName}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      taskName: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Định nghĩa quy trình</Label>
                <Input
                  value={filters.processDefinition}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      processDefinition: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md"
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
                    <SelectItem value="CREATED">Đã tạo</SelectItem>
                    <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                    <SelectItem value="CANCELED">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </details>

          <details open className="mb-3">
            <summary className="cursor-pointer text-sm font-semibold">Phân công</summary>
            <div className="mt-3 space-y-3">
              <Select
                value={filters.assignment}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, assignment: value }))
                }
              >
                <SelectTrigger className="h-9 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả việc</SelectItem>
                  <SelectItem value="ASSIGNED">Đã gán</SelectItem>
                  <SelectItem value="UNASSIGNED">Chưa gán</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label className="text-xs">Người phụ trách chứa</Label>
                <Input
                  value={filters.assignee}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      assignee: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md"
                />
              </div>
            </div>
          </details>

          <details open>
            <summary className="cursor-pointer text-sm font-semibold">Ngày tạo</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Tạo sau</Label>
                <Input
                  type="datetime-local"
                  value={filters.createdAfter}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      createdAfter: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tạo trước</Label>
                <Input
                  type="datetime-local"
                  value={filters.createdBefore}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      createdBefore: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md"
                />
              </div>
            </div>
          </details>
        </aside>
      )}

      <section className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 border bg-muted/40 px-3 py-2">
          <div className="relative">
            <Button
              className="h-9 rounded-md bg-primary hover:bg-primary/90"
              onClick={() => setFilterOpen((value) => !value)}
            >
              <Filter className="size-4" />
            </Button>
            {appliedFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-1.5 text-[10px] text-white">
                {appliedFiltersCount}
              </span>
            )}
          </div>
          <Button
            className="h-9 rounded-md bg-emerald-600 hover:bg-emerald-700"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-md"
            disabled={selected.size !== 1}
            onClick={() => {
              const key = Array.from(selected)[0];
              const task = tasks.find((item) => item.userTaskKey === key);
              if (task) setSelectedTask(task);
            }}
          >
            <Check className="size-4" />
            Hoàn thành việc
          </Button>
          <Button variant="outline" className="h-9 rounded-md" disabled>
            <Repeat2 className="size-4" />
            Gán lại việc
          </Button>
          <span className="ml-auto text-sm text-slate-500">
            {filteredTasks.length} việc
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
                    aria-label="Chọn tất cả việc đang hiển thị"
                  />
                </TableHead>
                <TableHead className="min-w-[210px]">ID việc</TableHead>
                <TableHead className="min-w-[170px]">Mã định nghĩa việc</TableHead>
                <TableHead className="min-w-[180px]">Tên</TableHead>
                <TableHead className="min-w-[210px]">Lượt chạy</TableHead>
                <TableHead className="min-w-[180px]">Quy trình</TableHead>
                <TableHead className="min-w-[170px]">Thời gian tạo</TableHead>
                <TableHead className="min-w-[120px]">Người phụ trách</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-40 text-center text-sm text-slate-500"
                  >
                    Đang tải việc...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-52 text-center text-sm text-slate-500"
                  >
                    Không tìm thấy việc người dùng.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.userTaskKey}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(task.userTaskKey)}
                        onChange={() => toggleOne(task.userTaskKey)}
                        aria-label={`Chọn việc ${task.userTaskKey}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        {task.userTaskKey}
                      </button>
                    </TableCell>
                    <TableCell>
                      <TaskTypeBadge elementId={task.elementId} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {task.name ?? task.elementId ?? '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {task.processInstanceKey ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.processDefinitionId ?? task.processDefinitionKey ?? '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(task.creationDate) || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {task.assignee || 'Chưa gán'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {selectedTask && (
        <UserTaskDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
