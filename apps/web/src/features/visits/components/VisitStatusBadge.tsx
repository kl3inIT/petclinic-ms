import { CheckCircle2, Clock, Loader2, XCircle, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VISIT_STATUS_LABEL, type DisplayVisitStatus } from '../labels';

const config: Record<DisplayVisitStatus, { className: string; icon: LucideIcon }> = {
  PENDING: {
    className:
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    icon: Clock,
  },
  SCHEDULED: {
    className:
      'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
    icon: Clock,
  },
  IN_PROGRESS: {
    className:
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    icon: Loader2,
  },
  COMPLETED: {
    className:
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    icon: CheckCircle2,
  },
  CANCELLED: {
    className:
      'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700',
    icon: XCircle,
  },
};

export function VisitStatusBadge({ status }: { status: DisplayVisitStatus }) {
  const { className, icon: Icon } = config[status];
  return (
    <Badge
      variant="secondary"
      className={cn('gap-1 rounded-full border-0 font-medium', className)}
    >
      <Icon className={cn('size-3.5', status === 'IN_PROGRESS' && 'animate-spin')} />
      {VISIT_STATUS_LABEL[status]}
    </Badge>
  );
}
