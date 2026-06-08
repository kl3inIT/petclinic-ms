import { Bell, CalendarCheck, HeartPulse, ShieldCheck } from 'lucide-react';

import { SearchVisitsStatus } from '@/lib/api/generated/model';
import { MetricCard } from './parts';
import type { StatusFilter } from './utils';

interface Counts {
  scheduled: number;
  completed: number;
  inProgress: number;
  cancelled: number;
}

export function CustomerVisitMetrics({
  counts,
  onFilter,
}: {
  counts: Counts;
  onFilter: (status: StatusFilter) => void;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={CalendarCheck}
        label="Lịch sắp tới"
        value={counts.scheduled}
        caption="Cuộc hẹn"
        action="Xem chi tiết"
        color="violet"
        onClick={() => onFilter(SearchVisitsStatus.SCHEDULED)}
      />
      <MetricCard
        icon={HeartPulse}
        label="Đã khám"
        value={counts.completed}
        caption="Lượt khám"
        action="Xem lịch sử"
        color="emerald"
        onClick={() => onFilter(SearchVisitsStatus.COMPLETED)}
      />
      <MetricCard
        icon={ShieldCheck}
        label="Đang xử lý"
        value={counts.inProgress}
        caption="Đang khám"
        action="Theo dõi"
        color="orange"
        onClick={() => onFilter(SearchVisitsStatus.IN_PROGRESS)}
      />
      <MetricCard
        icon={Bell}
        label="Đã huỷ"
        value={counts.cancelled}
        caption="Nhắc nhở"
        action="Xem chi tiết"
        color="rose"
        onClick={() => onFilter(SearchVisitsStatus.CANCELLED)}
      />
    </section>
  );
}
