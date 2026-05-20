import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Page header dùng chung cho mọi trang trong /vet/*. Giữ visual hierarchy nhất quán.
 *
 * Cấu trúc: icon (size lg, tinted bg) + title (h1) + subtitle (muted). Action slot
 * bên phải cho button "Edit", "Refresh", v.v.
 */
interface VetPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Slot bên phải header — vd nút "Cập nhật" / "Xuất CSV". */
  action?: React.ReactNode;
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
    <div
      className={cn(
        'flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
