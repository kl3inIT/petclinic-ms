import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarCheck, PawPrint, Plus, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { VISIT_STATUS_LABEL } from '../labels';

export function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  action,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption: string;
  action: string;
  color: 'violet' | 'emerald' | 'orange' | 'rose';
  onClick: () => void;
}) {
  const styles = {
    violet: { gradient: 'from-violet-50', text: 'text-violet-600', bg: 'bg-violet-100' },
    emerald: {
      gradient: 'from-emerald-50',
      text: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    orange: { gradient: 'from-orange-50', text: 'text-orange-500', bg: 'bg-orange-100' },
    rose: { gradient: 'from-rose-50', text: 'text-rose-500', bg: 'bg-rose-100' },
  }[color];

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-gradient-to-br p-5 shadow-[0_12px_34px_rgba(15,23,42,0.04)]',
        styles.gradient,
        'to-white',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-lg',
            styles.bg,
            styles.text,
          )}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-1 text-3xl leading-none font-extrabold text-slate-950">
            {value}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{caption}</p>
          <button
            type="button"
            onClick={onClick}
            className={cn('mt-3 text-xs font-bold hover:underline', styles.text)}
          >
            {action} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: VisitResponseStatus }) {
  const styles: Record<VisitResponseStatus, string> = {
    SCHEDULED: 'bg-violet-50 text-violet-700',
    IN_PROGRESS: 'bg-orange-50 text-orange-600',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-50 text-rose-600',
  };

  return (
    <span
      className={cn(
        'justify-self-start rounded-full px-3 py-1.5 text-xs font-extrabold md:justify-self-center',
        styles[status],
      )}
    >
      {VISIT_STATUS_LABEL[status]}
    </span>
  );
}

export function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

export function ResultBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function PetPill({
  icon: Icon,
  label,
  tone = 'slate',
}: {
  icon?: LucideIcon;
  label: string;
  tone?: 'slate' | 'green';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        tone === 'green'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-white/80 text-slate-700',
      )}
    >
      {Icon ? <Icon className="size-3" /> : null}
      {label}
    </span>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-xl bg-violet-50 text-primary">
        <CalendarCheck className="size-8" />
      </div>
      <div>
        <p className="font-bold text-slate-950">Chưa có lịch khám nào</p>
        <p className="text-sm text-slate-500">
          Hãy đặt lịch đầu tiên cho thú cưng của bạn.
        </p>
      </div>
      <Button asChild>
        <Link to="/customer/book">
          <Plus className="size-4" /> Đặt lịch khám mới
        </Link>
      </Button>
    </div>
  );
}

export { PawPrint };
