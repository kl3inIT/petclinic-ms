import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Empty state với icon lớn + message — dùng khi không có data (list rỗng).
 * Wrap trong Card để dòng spacing đồng nhất với các card khác trong cùng page.
 */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
