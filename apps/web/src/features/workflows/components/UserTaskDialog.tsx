import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCheck,
  X,
  ClipboardList,
  Calendar,
  User,
  Play,
  Stethoscope as StethoIcon,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
  approveVisit,
  completeUserTask,
  completeVisitExam,
  getWorkflowInstance,
  rejectVisit,
  startVisitExam,
  type UserTask,
} from '@/features/workflows/api';

interface UserTaskDialogProps {
  task: UserTask;
  onClose: () => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') {
    return v.toString();
  }
  if (typeof v === 'symbol') return v.description ?? v.toString();
  if (typeof v === 'function') return '[function]';

  const serialized = JSON.stringify(v);
  return serialized ?? '—';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

// ── Visit-booking: Duyệt lịch hẹn ────────────────────────────────────────

function ApproveVisitPanel({
  visitId,
  isPending,
  onApprove,
  onReject,
}: {
  visitId: number;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Visit #{visitId} — Staff/manager xem xét và duyệt hoặc từ chối lịch hẹn này.
      </p>
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-green-600 text-white hover:bg-green-700"
          disabled={isPending}
          onClick={onApprove}
        >
          <CheckCheck className="size-4" />
          Duyệt lịch hẹn
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={isPending}
          onClick={onReject}
        >
          <X className="size-4" />
          Từ chối
        </Button>
      </div>
    </div>
  );
}

// ── Visit-booking: Bắt đầu khám ──────────────────────────────────────────

function StartExamPanel({
  visitId,
  isPending,
  onStart,
}: {
  visitId: number;
  isPending: boolean;
  onStart: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Visit #{visitId} — Bác sĩ xác nhận bắt đầu khám. Visit sẽ chuyển sang IN_PROGRESS.
      </p>
      <Button
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={isPending}
        onClick={onStart}
      >
        <Play className="size-4" />
        {isPending ? 'Đang xử lý…' : 'Bắt đầu khám'}
      </Button>
    </div>
  );
}

// ── Visit-booking: Hoàn thành khám ───────────────────────────────────────

function CompleteExamPanel({
  visitId,
  isPending,
  onComplete,
}: {
  visitId: number;
  isPending: boolean;
  onComplete: (diagnosis: string, treatment: string, fee: number) => void;
}) {
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [fee, setFee] = useState('');

  const handleSubmit = () => {
    if (!diagnosis.trim() || !treatment.trim() || !fee) {
      toast.error('Vui lòng điền đầy đủ chẩn đoán, phác đồ và phí khám');
      return;
    }
    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 0) {
      toast.error('Phí khám không hợp lệ');
      return;
    }
    onComplete(diagnosis.trim(), treatment.trim(), feeNum);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Visit #{visitId} — Bác sĩ nhập kết quả khám. Visit sẽ chuyển sang COMPLETED.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="diagnosis" className="text-xs text-muted-foreground">
          Chẩn đoán *
        </Label>
        <Textarea
          id="diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          rows={2}
          placeholder="Nhập chẩn đoán bệnh..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="treatment" className="text-xs text-muted-foreground">
          Phác đồ điều trị *
        </Label>
        <Textarea
          id="treatment"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          rows={2}
          placeholder="Nhập phác đồ điều trị..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fee" className="text-xs text-muted-foreground">
          Phí khám (VNĐ) *
        </Label>
        <Input
          id="fee"
          type="number"
          min="0"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="150000"
        />
      </div>
      <Button className="w-full" disabled={isPending} onClick={handleSubmit}>
        <StethoIcon className="size-4" />
        {isPending ? 'Đang xử lý…' : 'Hoàn thành khám'}
      </Button>
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
      const parsed: unknown = JSON.parse(json.trim() || '{}');
      if (!isRecord(parsed)) {
        setJsonError('JSON phải là object');
        return;
      }
      setJsonError(null);
      onComplete(parsed);
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
          onChange={(e) => {
            setJson(e.target.value);
            setJsonError(null);
          }}
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

  const visitId = instance?.variables?.visitId as number | undefined;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const first = q.queryKey[0];
        return typeof first === 'string' && first.startsWith('/api/v1/visits');
      },
    });
  };

  const completeMutation = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      completeUserTask(task.userTaskKey, vars),
    onSuccess: () => {
      toast.success('Task đã hoàn thành');
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Không thể complete task'),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveVisit(visitId!),
    onSuccess: () => {
      toast.success('Đã duyệt lịch hẹn');
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Duyệt thất bại'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectVisit(visitId!),
    onSuccess: () => {
      toast.success('Đã từ chối lịch hẹn');
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Từ chối thất bại'),
  });

  const startMutation = useMutation({
    mutationFn: () => startVisitExam(visitId!),
    onSuccess: () => {
      toast.success('Đã bắt đầu khám');
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Bắt đầu thất bại'),
  });

  const completeExamMutation = useMutation({
    mutationFn: ({
      diagnosis,
      treatment,
      fee,
    }: {
      diagnosis: string;
      treatment: string;
      fee: number;
    }) => completeVisitExam(visitId!, diagnosis, treatment, fee),
    onSuccess: () => {
      toast.success('Hoàn thành khám thành công');
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Hoàn thành thất bại'),
  });

  const isAnyPending =
    completeMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    startMutation.isPending ||
    completeExamMutation.isPending;

  const isConfirmTask = task.elementId === 'ConfirmByDoctor';
  const isApproveTask = task.elementId === 'UserTask_Approve';
  const isStartTask = task.elementId === 'UserTask_StartVisit';
  const isCompleteTask = task.elementId === 'UserTask_CompleteVisit';

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
            <Badge
              variant="outline"
              className="border-amber-300 text-[10px] text-amber-600"
            >
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
            <span className="font-medium text-foreground">
              {task.assignee ?? 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>Created:</span>
            <span className="font-medium text-foreground">
              {formatDate(task.creationDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <code className="text-[10px]">key</code>
            <span className="font-mono text-[10px] text-foreground">
              {task.userTaskKey}
            </span>
          </div>
        </div>

        <Separator />

        {/* Process variables (context) */}
        {Object.keys(variables).length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
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
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {isConfirmTask || isApproveTask
              ? 'Quyết định'
              : isStartTask
                ? 'Bắt đầu khám'
                : isCompleteTask
                  ? 'Kết quả khám'
                  : 'Complete Task'}
          </p>
          {isApproveTask && visitId ? (
            <ApproveVisitPanel
              visitId={visitId}
              isPending={isAnyPending}
              onApprove={() => approveMutation.mutate()}
              onReject={() => rejectMutation.mutate()}
            />
          ) : isStartTask && visitId ? (
            <StartExamPanel
              visitId={visitId}
              isPending={isAnyPending}
              onStart={() => startMutation.mutate()}
            />
          ) : isCompleteTask && visitId ? (
            <CompleteExamPanel
              visitId={visitId}
              isPending={isAnyPending}
              onComplete={(diagnosis, treatment, fee) =>
                completeExamMutation.mutate({ diagnosis, treatment, fee })
              }
            />
          ) : isConfirmTask ? (
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
