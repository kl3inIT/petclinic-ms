import type { ReactNode } from 'react';

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
        <h1 className="text-[28px] leading-tight font-black tracking-tight text-slate-950">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">{subtitle}</p>
        ) : null}
        <div className="mt-3 h-1 w-9 rounded-full bg-[#7C6CF5] shadow-[0_6px_14px_rgba(124,108,245,0.35)]" />
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
      className={`relative overflow-hidden rounded-[22px] border border-[#ECECF5] bg-white/95 p-6 shadow-[0_22px_60px_rgba(30,30,70,0.08)] backdrop-blur ${className ?? ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F6F3FF] to-transparent" />
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
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F7F4FF] to-white text-[#7C6CF5] shadow-sm ring-1 ring-[#ECE7FF]">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-[15px] font-black text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
