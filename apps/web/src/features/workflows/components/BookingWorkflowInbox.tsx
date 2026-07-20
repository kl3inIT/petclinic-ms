import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  BellRing,
  ClipboardCheck,
  RefreshCw,
  Stethoscope,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useListVets } from '@/lib/api/generated/vets/vets';
import {
  completeUserTask,
  getWorkflowInstance,
  listUserTasks,
  type UserTask,
} from '@/features/workflows/api';

type InboxRole = 'reception' | 'doctor';

const RECEPTION_TASKS = new Set([
  'Task_TiepNhan',
  'Task_ThongBaoDoi',
  'Task_ThongBaoKetQua',
  'Task_QuanLyChon',
]);

const DOCTOR_TASKS = new Set(['Task_BacSiXacNhan', 'Task_BacSiMoiXacNhan']);

function formatDate(iso?: string) {
  return iso
    ? new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Vừa tạo';
}

function scalarText(value: unknown): string | null {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : null;
}

function taskHint(task: UserTask) {
  switch (task.elementId) {
    case 'Task_TiepNhan':
      return 'Đối chiếu chuyên môn của bác sĩ với nhu cầu khám trước khi chuyển lịch.';
    case 'Task_BacSiXacNhan':
      return 'Xác nhận có thể nhận lịch khám này.';
    case 'Task_ThongBaoDoi':
      return 'Thông báo khách hàng cần đổi bác sĩ rồi chuyển việc chọn bác sĩ mới.';
    case 'Task_QuanLyChon':
      return 'Chọn bác sĩ phù hợp để thay thế cho lịch khám.';
    case 'Task_BacSiMoiXacNhan':
      return 'Xác nhận nhận lịch khám đã được điều phối lại.';
    case 'Task_ThongBaoKetQua':
      return 'Thông báo khách hàng về bác sĩ mới và kết quả điều phối.';
    default:
      return 'Hoàn thành việc để quy trình tiếp tục.';
  }
}

function taskAction(task: UserTask) {
  switch (task.elementId) {
    case 'Task_TiepNhan':
      return 'Kiểm tra chuyên môn';
    case 'Task_BacSiXacNhan':
    case 'Task_BacSiMoiXacNhan':
      return 'Xác nhận lịch';
    case 'Task_QuanLyChon':
      return 'Chọn bác sĩ';
    default:
      return 'Xác nhận đã thông báo';
  }
}

function isTaskForRole(task: UserTask, role: InboxRole) {
  const elementId = task.elementId ?? '';
  return role === 'reception'
    ? RECEPTION_TASKS.has(elementId)
    : DOCTOR_TASKS.has(elementId);
}

/**
 * Inbox tác nghiệp cho BPMN dat-lich-v3. UI lọc theo role; backend vẫn là nguồn
 * quyết định cuối cùng khi hoàn thành task.
 */
export function BookingWorkflowInbox({ role }: { role: InboxRole }) {
  const [selected, setSelected] = useState<UserTask | null>(null);
  const queryClient = useQueryClient();
  const {
    data: tasks = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['booking-workflow-tasks', role],
    queryFn: () => listUserTasks(undefined, 'CREATED'),
    refetchInterval: 5000,
  });

  const visibleTasks = useMemo(
    () => tasks.filter((task) => isTaskForRole(task, role)),
    [role, tasks],
  );
  const roleLabel = role === 'reception' ? 'Lễ tân' : 'Bác sĩ';
  const RoleIcon = role === 'reception' ? ClipboardCheck : Stethoscope;

  const refreshVisitsAndTasks = () => {
    void queryClient.invalidateQueries({ queryKey: ['booking-workflow-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const first = query.queryKey[0];
        return typeof first === 'string' && first.startsWith('/api/v1/visits');
      },
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <RoleIcon className="size-4 text-primary" />
            Việc đặt lịch cần {roleLabel.toLowerCase()} xử lý
            <Badge variant="secondary">{visibleTasks.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Quy trình Đặt lịch khám thú cưng · tự làm mới mỗi 5 giây.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải việc từ quy trình…</p>
        ) : visibleTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Không có việc đặt lịch nào đang chờ bạn xử lý.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleTasks.map((task) => (
              <div key={task.userTaskKey} className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{task.name ?? task.elementId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{taskHint(task)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-300 text-amber-700"
                  >
                    Đang chờ
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(task.creationDate)}</span>
                  <Button size="sm" onClick={() => setSelected(task)}>
                    {taskAction(task)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {selected && (
        <BookingTaskDialog
          key={selected.userTaskKey}
          task={selected}
          onClose={() => setSelected(null)}
          onCompleted={() => {
            refreshVisitsAndTasks();
            setSelected(null);
          }}
        />
      )}
    </Card>
  );
}

function BookingTaskDialog({
  task,
  onClose,
  onCompleted,
}: {
  task: UserTask;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [note, setNote] = useState('');
  const [replacementVetId, setReplacementVetId] = useState<string>('');
  const instanceQuery = useQuery({
    queryKey: ['booking-workflow-instance', task.processInstanceKey],
    queryFn: () => getWorkflowInstance(task.processInstanceKey!),
    enabled: !!task.processInstanceKey,
  });
  const vetsQuery = useListVets(
    { pageable: { page: 0, size: 100, sort: ['lastName,asc'] } },
    { query: { enabled: task.elementId === 'Task_QuanLyChon' } },
  );

  const completeMutation = useMutation({
    mutationFn: (variables: Record<string, unknown>) =>
      completeUserTask(task.userTaskKey, variables),
    onSuccess: () => {
      toast.success('Đã hoàn thành việc trong quy trình đặt lịch');
      onCompleted();
    },
    onError: (error: Error) => toast.error(error.message || 'Không thể hoàn thành việc'),
  });

  const finish = (variables: Record<string, unknown> = {}) => {
    const trimmedNote = note.trim();
    completeMutation.mutate(
      trimmedNote ? { ...variables, ghiChu: trimmedNote } : variables,
    );
  };

  const selectedVet = (vetsQuery.data?.content ?? []).find(
    (vet) => String(vet.id) === replacementVetId,
  );
  const variables = instanceQuery.data?.variables ?? {};
  const visitId = scalarText(variables.visitId);
  const petType = scalarText(variables.loaiThuCung);
  const replacementVetName = scalarText(variables.bacSiMoiTen);
  const context = [
    visitId != null ? `Lịch #${visitId}` : null,
    petType ? `Thú cưng: ${petType}` : null,
    replacementVetName ? `Bác sĩ mới: ${replacementVetName}` : null,
  ].filter(Boolean);

  const isReceptionCheck = task.elementId === 'Task_TiepNhan';
  const isChooseVet = task.elementId === 'Task_QuanLyChon';
  const isDoctorConfirm =
    task.elementId === 'Task_BacSiXacNhan' || task.elementId === 'Task_BacSiMoiXacNhan';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{task.name ?? task.elementId}</DialogTitle>
          <DialogDescription>{taskHint(task)}</DialogDescription>
        </DialogHeader>

        {context.length > 0 && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {context.join(' · ')}
          </div>
        )}

        {isReceptionCheck ? (
          <div className="space-y-3">
            <p className="text-sm">
              Chọn kết quả kiểm tra để gateway của BPMN điều hướng lịch.
            </p>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú cho bác sĩ hoặc khách hàng (không bắt buộc)"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => finish({ dungChuyenMon: true })}
                disabled={completeMutation.isPending}
              >
                <BadgeCheck className="size-4" /> Đúng chuyên môn
              </Button>
              <Button
                variant="outline"
                onClick={() => finish({ dungChuyenMon: false })}
                disabled={completeMutation.isPending}
              >
                <UserRoundCheck className="size-4" /> Cần đổi bác sĩ
              </Button>
            </div>
          </div>
        ) : isChooseVet ? (
          <div className="space-y-3">
            <Label htmlFor="replacement-vet">Bác sĩ thay thế</Label>
            <Select value={replacementVetId} onValueChange={setReplacementVetId}>
              <SelectTrigger id="replacement-vet">
                <SelectValue
                  placeholder={vetsQuery.isLoading ? 'Đang tải bác sĩ…' : 'Chọn bác sĩ'}
                />
              </SelectTrigger>
              <SelectContent>
                {(vetsQuery.data?.content ?? []).map((vet) => (
                  <SelectItem key={vet.id} value={String(vet.id)}>
                    {`${vet.firstName ?? ''} ${vet.lastName ?? ''}`.trim() ||
                      `Bác sĩ #${vet.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Lý do điều phối (không bắt buộc)"
            />
            <Button
              className="w-full"
              disabled={!selectedVet || completeMutation.isPending}
              onClick={() =>
                finish({
                  bacSiMoiId: selectedVet?.id,
                  bacSiMoiTen:
                    `${selectedVet?.firstName ?? ''} ${selectedVet?.lastName ?? ''}`.trim(),
                })
              }
            >
              <UserRoundCheck className="size-4" /> Xác nhận bác sĩ thay thế
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isDoctorConfirm
                  ? 'Ghi chú xác nhận (không bắt buộc)'
                  : 'Nội dung đã thông báo (không bắt buộc)'
              }
            />
            <Button
              className="w-full"
              disabled={completeMutation.isPending}
              onClick={() =>
                finish(
                  isDoctorConfirm
                    ? { bacSiDaXacNhan: true }
                    : { daThongBaoNguoiDung: true },
                )
              }
            >
              {isDoctorConfirm ? (
                <Stethoscope className="size-4" />
              ) : (
                <BellRing className="size-4" />
              )}
              {isDoctorConfirm ? 'Xác nhận nhận lịch' : 'Xác nhận đã thông báo'}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={completeMutation.isPending}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
