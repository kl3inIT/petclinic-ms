import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hiển thị điểm dạng 5 sao (filled / unfilled). Read-only.
 * Khác `scoreStars()` text helper ở chỗ dùng SVG icon → đẹp hơn + accessible.
 */
export function StarRating({
  score,
  size = 'sm',
  showNumber = false,
}: {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
}) {
  const sizeClass = size === 'lg' ? 'size-5' : size === 'md' ? 'size-4' : 'size-3.5';
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i <= score
              ? 'fill-amber-400 text-amber-400'
              : 'fill-none text-muted-foreground/30',
          )}
        />
      ))}
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          {score}
        </span>
      )}
    </div>
  );
}
