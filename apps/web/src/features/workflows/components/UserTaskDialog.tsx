import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, X, ClipboardList, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  completeUserTask,
  getWorkflowInstance,
  type UserTask,
} from '@/features/workflows/api';

interface UserTaskDialogProps {
  task: UserTask;
  onClose: () => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ── Doctor-confirmation specific UI ─────────────────────────────────────────

function DoctorConfirmPanel({
  isPending,
  onApprove,
  onReject,
}: {
  isPending: boolean;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="doctorNotes" className="text-xs text-muted-foreground">
          Ghi chú của bác sĩ (tùy chọn)
        </Label>
        <Textarea
          id="doctorNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Nhập nhận xét, lưu ý hoặc lý do từ chối…"
        />
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-green-600 text-white hover:bg-green-700"
          disabled={isPending}
          onClick={() => onApprove(notes)}
        >
          <CheckCheck className="size-4" />
          Xác nhận &amp; Đồng ý
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={isPending}
          onClick={() => onReject(notes)}
        >
          <X className="size-4" />
          Từ chối
        </Button>
      </div>
    </div>
  );
}

// ── Generic variable-output UI ────────────────────────────────────────────

function GenericCompletePanel({
  isPending,
  onComplete,
}: {
  isPending: boolean;
  onComplete: (vars: Record<string, unknown>) => void;
}) {
  const [json, setJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleComplete = () => {
    try {
      const vars = JSON.parse(json.trim() || '{}');
      setJsonError(null);
      onComplete(vars);
    } catch {
      setJsonError('JSON không hợp lệ');
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="taskVars" className="text-xs text-muted-foreground">
          Output Variables (JSON)
        </Label>
        <Textarea
          id="taskVars"
          value={json}
          onChange={(e) => { setJson(e.target.value); setJsonError(null); }}
          className="font-mono text-xs"
          rows={5}
          placeholder='{ "approved": true, "notes": "ok" }'
        />
        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      </div>
      <Button className="w-full" disabled={isPending} onClick={handleComplete}>
        <CheckCheck className="size-4" />
        {isPending ? 'Đang xử lý…' : 'Complete Task'}
      </Button>
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────

export function UserTaskDialog({ task, onClose }: UserTaskDialogProps) {
  const queryClient = useQueryClient();

  const { data: instance } = useQuery({
    queryKey: ['workflow-instance', task.processInstanceKey],
    queryFn: () => getWorkflowInstance(task.processInstanceKey!),
    enabled: !!task.processInstanceKey,
  });

  const completeMutation = useMutation({
    mutationFn: (vars: Record<string, unknown>) => completeUserTask(task.userTaskKey, vars),
    onSuccess: () => {
      toast.success('Task đã hoàn thành');
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Không thể complete task'),
  });

  const isConfirmTask = task.elementId === 'ConfirmByDoctor';

  const handleApprove = (notes: string) =>
    completeMutation.mutate({ doctorApproved: true, doctorNotes: notes });
  const handleReject = (notes: string) =>
    completeMutation.mutate({ doctorApproved: false, doctorNotes: notes });
  const handleComplete = (vars: Record<string, unknown>) => completeMutation.mutate(vars);

  const variables = instance?.variables ?? {};

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" />
            {task.name ?? task.elementId ?? 'User Task'}
            <Badge variant="outline" className="border-amber-300 text-amber-600 text-[10px]">
              PENDING
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Task metadata */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ClipboardList className="size-3.5 shrink-0" />
            <span>Process:</span>
            <span className="font-medium text-foreground">
              {task.processDefinitionId ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="size-3.5 shrink-0" />
            <span>Assignee:</span>
            <span className="font-medium text-foreground">{task.assignee ?? 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>Created:</span>
            <span className="font-medium text-foreground">{formatDate(task.creationDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <code className="text-[10px]">key</code>
            <span className="font-mono text-[10px] text-foreground">{task.userTaskKey}</span>
          </div>
        </div>

        <Separator />

        {/* Process variables (context) */}
        {Object.keys(variables).length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Process Variables
            </p>
            <div className="max-h-40 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px] py-1.5 text-xs">Name</TableHead>
                    <TableHead className="py-1.5 text-xs">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(variables).map(([name, value]) => (
                    <TableRow key={name}>
                      <TableCell className="py-1.5 font-mono text-xs">{name}</TableCell>
                      <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                        {formatValue(value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <Separator />

        {/* Completion form */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isConfirmTask ? 'Quyết định của Bác sĩ' : 'Complete Task'}
          </p>
          {isConfirmTask ? (
            <DoctorConfirmPanel
              isPending={completeMutation.isPending}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ) : (
            <GenericCompletePanel
              isPending={completeMutation.isPending}
              onComplete={handleComplete}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
