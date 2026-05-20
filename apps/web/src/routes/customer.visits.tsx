import { useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Stethoscope,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VisitStatusBadge } from '@/features/visits/components/VisitStatusBadge';
import { useSearchVisits, useCancelVisit } from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { SearchVisitsStatus, type SearchVisitsParams } from '@/lib/api/generated/model';
import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/customer/visits')({
  component: CustomerVisitsPage,
});

const ALL = 'ALL' as const;

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'full',
  timeStyle: 'short',
});

function CustomerVisitsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SearchVisitsStatus | typeof ALL>(ALL);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VisitResponse | null>(null);

  const params: SearchVisitsParams = {
    pageable: { page: 0, size: 50, sort: ['scheduledAt,desc'] },
    ...(statusFilter !== ALL ? { status: statusFilter } : {}),
  };

  const listQuery = useSearchVisits(params);

  const cancelMutation = useCancelVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đã huỷ lịch khám');
        void qc.invalidateQueries({
          predicate: (q) => {
            const first = q.queryKey[0];
            return typeof first === 'string' && first.startsWith('/api/v1/visits');
          },
        });
        setCancelTarget(null);
      },
      onError: (err: Error) => toast.error(err.message || 'Huỷ thất bại'),
    },
  });

  const visits = listQuery.data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lịch khám của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi toàn bộ lịch sử khám và trạng thái cập nhật real-time.
          </p>
        </div>
        <Button asChild>
          <Link to="/customer/book">
            <Plus className="size-4" /> Đặt lịch mới
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Bộ lọc trạng thái</CardTitle>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as SearchVisitsStatus | typeof ALL)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả</SelectItem>
              <SelectItem value={SearchVisitsStatus.SCHEDULED}>Đã đặt</SelectItem>
              <SelectItem value={SearchVisitsStatus.IN_PROGRESS}>Đang khám</SelectItem>
              <SelectItem value={SearchVisitsStatus.COMPLETED}>Hoàn thành</SelectItem>
              <SelectItem value={SearchVisitsStatus.CANCELLED}>Đã huỷ</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {listQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <CalendarCheck className="size-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">Chưa có lịch khám nào</p>
                <p className="text-sm text-muted-foreground">
                  Hãy đặt lịch đầu tiên cho thú cưng của bạn.
                </p>
              </div>
              <Button asChild>
                <Link to="/customer/book">
                  <Plus className="size-4" /> Đặt lịch
                </Link>
              </Button>
            </div>
          ) : (
            visits.map((v) => (
              <VisitItem
                key={v.id}
                visit={v}
                expanded={expandedId === v.id}
                onToggle={() =>
                  setExpandedId(expandedId === v.id ? null : (v.id ?? null))
                }
                onCancel={() => setCancelTarget(v)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ lịch khám?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn chắc chắn muốn huỷ lịch khám #{cancelTarget?.id} vào lúc{' '}
              {cancelTarget?.scheduledAt
                ? dateFmt.format(new Date(cancelTarget.scheduledAt))
                : '—'}
              ? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelTarget?.id && cancelMutation.mutate({ id: cancelTarget.id })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? 'Đang huỷ…' : 'Xác nhận huỷ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VisitItem({
  visit,
  expanded,
  onToggle,
  onCancel,
}: {
  visit: VisitResponse;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
}) {
  const canCancel =
    visit.status === VisitResponseStatus.SCHEDULED ||
    visit.status === VisitResponseStatus.IN_PROGRESS;

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Stethoscope className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-muted-foreground" />
              {visit.scheduledAt ? dateFmt.format(new Date(visit.scheduledAt)) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Pet #{visit.petId} • BS #{visit.vetId}
              {visit.reason ? ` • ${visit.reason}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {visit.status ? <VisitStatusBadge status={visit.status} /> : null}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className={cn('space-y-3 border-t bg-muted/20 p-4 text-sm')}>
          <DetailRow label="Mã lịch" value={`#${visit.id}`} />
          <DetailRow label="Lý do" value={visit.reason || '—'} />
          {visit.status === VisitResponseStatus.COMPLETED ? (
            <>
              <DetailRow label="Chẩn đoán" value={visit.diagnosis || '—'} />
              <DetailRow label="Điều trị" value={visit.treatment || '—'} />
              <DetailRow
                label="Phí khám"
                value={
                  visit.fee !== undefined
                    ? visit.fee.toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      })
                    : '—'
                }
              />
            </>
          ) : null}

          {canCancel ? (
            <div className="flex justify-end pt-2">
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <XCircle className="size-4" /> Huỷ lịch
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
