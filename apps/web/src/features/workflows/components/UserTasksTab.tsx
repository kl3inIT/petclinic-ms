import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ClipboardList, Filter, RefreshCw, Repeat2, Search, Stethoscope, X } from 'lucide-react';

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
      <Badge variant="outline" className="rounded-[3px] border-violet-300 text-violet-700 text-[10px]">
        <Stethoscope className="mr-1 size-2.5" />
        Doctor Confirm
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-[3px] border-slate-300 text-slate-600 text-[10px]">
      <ClipboardList className="mr-1 size-2.5" />
      User Task
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

  const { data: tasks = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['user-tasks', filters.state],
    queryFn: () => listUserTasks(undefined, filters.state === 'ALL' ? undefined : filters.state),
    refetchInterval: filters.state === 'CREATED' || filters.state === 'ALL' ? 5000 : false,
  });

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const created = task.creationDate ? new Date(task.creationDate).getTime() : 0;
        const createdAfter = filters.createdAfter ? new Date(filters.createdAfter).getTime() : null;
        const createdBefore = filters.createdBefore ? new Date(filters.createdBefore).getTime() : null;
        const assignmentMatches =
          filters.assignment === 'ALL' ||
          (filters.assignment === 'ASSIGNED' && !!task.assignee) ||
          (filters.assignment === 'UNASSIGNED' && !task.assignee);
        return (
          includes(task.elementId, filters.taskKey) &&
          includes(task.name, filters.taskName) &&
          includes(task.processDefinitionId ?? task.processDefinitionKey, filters.processDefinition) &&
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
    filteredTasks.length > 0 && filteredTasks.every((task) => selected.has(task.userTaskKey));

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
    <div className="flex h-full min-h-[640px] gap-3 bg-white p-1">
      {filterOpen && (
        <aside className="w-[310px] shrink-0 overflow-auto border bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Task filter</h3>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="size-8 rounded-[3px]" onClick={() => refetch()}>
                <Search className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-[3px] text-red-600"
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
            <summary className="cursor-pointer text-sm font-semibold">General</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Task key like</Label>
                <Input
                  value={filters.taskKey}
                  onChange={(event) => setFilters((current) => ({ ...current, taskKey: event.target.value }))}
                  className="h-9 rounded-[3px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Task name like</Label>
                <Input
                  value={filters.taskName}
                  onChange={(event) => setFilters((current) => ({ ...current, taskName: event.target.value }))}
                  className="h-9 rounded-[3px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Process definition</Label>
                <Input
                  value={filters.processDefinition}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, processDefinition: event.target.value }))
                  }
                  className="h-9 rounded-[3px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Select
                  value={filters.state}
                  onValueChange={(value) => setFilters((current) => ({ ...current, state: value }))}
                >
                  <SelectTrigger className="h-9 rounded-[3px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="CREATED">Created</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELED">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </details>

          <details open className="mb-3">
            <summary className="cursor-pointer text-sm font-semibold">Assignment</summary>
            <div className="mt-3 space-y-3">
              <Select
                value={filters.assignment}
                onValueChange={(value) => setFilters((current) => ({ ...current, assignment: value }))}
              >
                <SelectTrigger className="h-9 rounded-[3px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All tasks</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label className="text-xs">Assignee like</Label>
                <Input
                  value={filters.assignee}
                  onChange={(event) => setFilters((current) => ({ ...current, assignee: event.target.value }))}
                  className="h-9 rounded-[3px]"
                />
              </div>
            </div>
          </details>

          <details open>
            <summary className="cursor-pointer text-sm font-semibold">Creation date</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Created after</Label>
                <Input
                  type="datetime-local"
                  value={filters.createdAfter}
                  onChange={(event) => setFilters((current) => ({ ...current, createdAfter: event.target.value }))}
                  className="h-9 rounded-[3px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Created before</Label>
                <Input
                  type="datetime-local"
                  value={filters.createdBefore}
                  onChange={(event) => setFilters((current) => ({ ...current, createdBefore: event.target.value }))}
                  className="h-9 rounded-[3px]"
                />
              </div>
            </div>
          </details>
        </aside>
      )}

      <section className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 border bg-slate-50 px-3 py-2">
          <div className="relative">
            <Button
              className="h-9 rounded-[3px] bg-[#0f5b6b] hover:bg-[#0d4d5b]"
              onClick={() => setFilterOpen((value) => !value)}
            >
              <Filter className="size-4" />
            </Button>
            {appliedFiltersCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-slate-900 px-1.5 text-[10px] text-white">
                {appliedFiltersCount}
              </span>
            )}
          </div>
          <Button
            className="h-9 rounded-[3px] bg-emerald-600 hover:bg-emerald-700"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-[3px]"
            disabled={selected.size !== 1}
            onClick={() => {
              const key = Array.from(selected)[0];
              const task = tasks.find((item) => item.userTaskKey === key);
              if (task) setSelectedTask(task);
            }}
          >
            <Check className="size-4" />
            Complete task
          </Button>
          <Button variant="outline" className="h-9 rounded-[3px]" disabled>
            <Repeat2 className="size-4" />
            Reassign task
          </Button>
          <span className="ml-auto text-sm text-slate-500">
            {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
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
                    aria-label="Select all visible tasks"
                  />
                </TableHead>
                <TableHead className="min-w-[210px]">Task id</TableHead>
                <TableHead className="min-w-[170px]">Task definition key</TableHead>
                <TableHead className="min-w-[180px]">Name</TableHead>
                <TableHead className="min-w-[210px]">Process instance</TableHead>
                <TableHead className="min-w-[180px]">Process</TableHead>
                <TableHead className="min-w-[170px]">Create time</TableHead>
                <TableHead className="min-w-[120px]">Assignee</TableHead>
                <TableHead className="w-[90px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center text-sm text-slate-500">
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-52 text-center text-sm text-slate-500">
                    No user tasks found.
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
                        aria-label={`Select task ${task.userTaskKey}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="font-mono text-xs font-semibold text-[#0f5b6b] hover:underline"
                      >
                        {task.userTaskKey}
                      </button>
                    </TableCell>
                    <TableCell>
                      <TaskTypeBadge elementId={task.elementId} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{task.name ?? task.elementId ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{task.processInstanceKey ?? '-'}</TableCell>
                    <TableCell className="text-sm">{task.processDefinitionId ?? task.processDefinitionKey ?? '-'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDate(task.creationDate) || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{task.assignee || 'Unassigned'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="rounded-[3px] bg-[#0f5b6b] hover:bg-[#0d4d5b]" onClick={() => setSelectedTask(task)}>
                        <Check className="size-3.5" />
                        Complete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {selectedTask && <UserTaskDialog task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}
