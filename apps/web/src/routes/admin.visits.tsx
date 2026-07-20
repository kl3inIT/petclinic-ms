import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useSearchVisits,
  useStartVisit,
  useCancelVisit,
} from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { VisitsDataTable } from '@/features/visits/components/VisitsDataTable';
import { BookVisitDialog } from '@/features/visits/components/BookVisitDialog';
import { CompleteVisitDialog } from '@/features/visits/components/CompleteVisitDialog';
import { PrescriptionDialog } from '@/features/visits/components/PrescriptionDialog';
import { BookingWorkflowInbox } from '@/features/workflows/components/BookingWorkflowInbox';
import { SearchVisitsStatus, type SearchVisitsParams } from '@/lib/api/generated/model';

export const Route = createFileRoute('/admin/visits')({
  component: VisitsPage,
});

const ALL = 'ALL' as const;

function VisitsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SearchVisitsStatus | typeof ALL>(ALL);
  const [bookOpen, setBookOpen] = useState(false);
  const [completingVisit, setCompletingVisit] = useState<VisitResponse | null>(null);
  const [prescribingVisit, setPrescribingVisit] = useState<VisitResponse | null>(null);

  const params: SearchVisitsParams = {
    pageable: { page: 0, size: 50, sort: ['scheduledAt,desc'] },
    ...(statusFilter !== ALL ? { status: statusFilter } : {}),
  };

  const listQuery = useSearchVisits(params);

  const invalidateAll = () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const first = q.queryKey[0];
        return typeof first === 'string' && first.startsWith('/api/v1/visits');
      },
    });

  const startMutation = useStartVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đã bắt đầu khám');
        void invalidateAll();
      },
      onError: (err: Error) => toast.error(err.message || 'Lỗi'),
    },
  });

  const cancelMutation = useCancelVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đã hủy visit');
        void invalidateAll();
      },
      onError: (err: Error) => toast.error(err.message || 'Hủy thất bại'),
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Visits</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý lịch khám — đặt mới, theo dõi tiến độ, hoàn thành.
            </p>
          </div>
        </div>
        <Button onClick={() => setBookOpen(true)}>
          <Plus />
          Đặt lịch mới
        </Button>
      </div>

      <BookingWorkflowInbox role="reception" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Bộ lọc</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Trạng thái</span>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as SearchVisitsStatus | typeof ALL)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả</SelectItem>
                <SelectItem value={SearchVisitsStatus.SCHEDULED}>Đã đặt</SelectItem>
                <SelectItem value={SearchVisitsStatus.IN_PROGRESS}>Đang khám</SelectItem>
                <SelectItem value={SearchVisitsStatus.COMPLETED}>Hoàn thành</SelectItem>
                <SelectItem value={SearchVisitsStatus.CANCELLED}>Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <VisitsDataTable
            data={listQuery.data?.content ?? []}
            isLoading={listQuery.isLoading}
            onStart={(id) => startMutation.mutate({ id })}
            onComplete={(v) => setCompletingVisit(v)}
            onCancel={(id) => cancelMutation.mutate({ id })}
            onPrescribe={(v) => setPrescribingVisit(v)}
          />
          {listQuery.data ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Hiển thị {listQuery.data.content?.length ?? 0} /{' '}
              {listQuery.data.totalElements ?? 0} kết quả
            </p>
          ) : null}
        </CardContent>
      </Card>

      <BookVisitDialog open={bookOpen} onOpenChange={setBookOpen} />
      <CompleteVisitDialog
        visit={completingVisit}
        onOpenChange={(o) => !o && setCompletingVisit(null)}
      />
      <PrescriptionDialog
        visit={prescribingVisit}
        onOpenChange={(o) => !o && setPrescribingVisit(null)}
      />
    </div>
  );
}
