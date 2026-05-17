import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { VISIT_STATUS_LABEL } from '../labels';

const styles: Record<VisitResponseStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELLED: 'bg-zinc-200 text-zinc-700 hover:bg-zinc-200 line-through dark:bg-zinc-800 dark:text-zinc-400',
};

export function VisitStatusBadge({ status }: { status: VisitResponseStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-medium', styles[status])}>
      {VISIT_STATUS_LABEL[status]}
    </Badge>
  );
}
