import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { PawPrint } from 'lucide-react';
import { toast } from 'sonner';

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
import { SearchVisitsStatus, type SearchVisitsParams } from '@/lib/api/generated/model';
import { VisitsDataTable } from '@/features/visits/components/VisitsDataTable';
import { CompleteAndInvoiceDialog } from '@/features/visits/components/CompleteAndInvoiceDialog';
import { PrescriptionDialog } from '@/features/visits/components/PrescriptionDialog';
import { useMyProfile } from '@/features/vet-me/api';

export const Route = createFileRoute('/vet/visits')({
  component: VetVisitsPage,
});

const ALL = 'ALL' as const;

function VetVisitsPage() {
  const qc = useQueryClient();
  const profileQuery = useMyProfile();
  const vetId = profileQuery.data?.id;

  const [statusFilter, setStatusFilter] = useState<SearchVisitsStatus | typeof ALL>(ALL);
  const [completingVisit, setCompletingVisit] = useState<VisitResponse | null>(null);
  const [prescribingVisit, setPrescribingVisit] = useState<VisitResponse | null>(null);

  const params: SearchVisitsParams = {
    pageable: { page: 0, size: 50, sort: ['scheduledAt,desc'] },
    ...(vetId != null ? { vetId } : {}),
    ...(statusFilter !== ALL ? { status: statusFilter } : {}),
  };

  const listQuery = useSearchVisits(params, {
    query: { enabled: vetId != null },
  });

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
        toast.success('Đã hủy lịch khám');
        void invalidateAll();
      },
      onError: (err: Error) => toast.error(err.message || 'Hủy thất bại'),
    },
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PawPrint className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ca khám của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Các lịch khám được đặt cho bạn — hỗ trợ chẩn đoán, điều trị, phí và kê đơn
            thuốc.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Bộ lọc</CardTitle>
            <p className="text-sm text-muted-foreground">
              Lọc danh sách ca khám theo trạng thái.
            </p>
          </div>
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
            isLoading={profileQuery.isLoading || listQuery.isLoading}
            onStart={(id) => startMutation.mutate({ id })}
            onComplete={(v) => setCompletingVisit(v)}
            onCancel={(id) => cancelMutation.mutate({ id })}
            onPrescribe={(v) => setPrescribingVisit(v)}
          />
          {listQuery.data ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Hiển thị {listQuery.data.content?.length ?? 0} /{' '}
              {listQuery.data.totalElements ?? 0} ca khám
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CompleteAndInvoiceDialog
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
