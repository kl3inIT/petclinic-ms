import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface VetPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function VetPageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: VetPageHeaderProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-violet-100 bg-white/80 px-4 py-5 shadow-sm sm:px-6',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm">
            <Icon className="size-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold text-slate-950">{title}</h1>
            {subtitle && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </section>
  );
}
