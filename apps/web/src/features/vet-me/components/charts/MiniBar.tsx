import { cn } from '@/lib/utils';

interface MiniBarProps {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
  className?: string;
  barClassName?: string;
  highlightLast?: boolean;
}

export function MiniBar({
  values,
  labels,
  width = 220,
  height = 64,
  className,
  barClassName = 'fill-violet-400',
  highlightLast = false,
}: MiniBarProps) {
  if (values.length === 0) {
    return <div className={cn('h-16 w-full', className)} aria-hidden />;
  }
  const max = Math.max(...values, 1);
  const gap = 4;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const labelHeight = labels ? 12 : 0;
  const chartHeight = height - labelHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={cn('block', className)}
      aria-hidden
    >
      {values.map((v, i) => {
        const x = i * (barWidth + gap);
        const h = (v / max) * (chartHeight - 4);
        const y = chartHeight - h;
        const isLast = highlightLast && i === values.length - 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 1)}
              rx={2}
              className={isLast ? 'fill-violet-600' : barClassName}
            />
            {labels && (
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize="9"
                className="fill-slate-400"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
