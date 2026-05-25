import { cn } from '@/lib/utils';

interface CircleProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  progressClassName?: string;
  className?: string;
  label?: React.ReactNode;
}

export function CircleProgress({
  value,
  max = 100,
  size = 96,
  strokeWidth = 8,
  trackClassName = 'stroke-violet-100',
  progressClassName = 'stroke-violet-600',
  className,
  label,
}: CircleProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, value / max));
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn('transition-all duration-500 ease-out', progressClassName)}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          {label}
        </div>
      )}
    </div>
  );
}
