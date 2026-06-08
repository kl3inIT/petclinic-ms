import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Page header sticky cho mỗi profile sub-page. Đồng nhất visual hierarchy. */
export function ProfilePageHeader({ title, subtitle, actions }: Props) {
  return (
    <section className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-black tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-3 h-1 w-9 rounded-full bg-primary" />
      </div>
      {actions}
    </section>
  );
}

/** Card wrapper với gradient ambient + backdrop blur consistent giữa sub-pages. */
export function ProfileCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[22px] border border-border bg-card p-6 shadow-[0_22px_60px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Section title bên trong card — icon + label inline. */
export function CardTitleRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-[15px] font-black text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
