import { cn } from '@/lib/utils';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
}

export function Sparkline({
  values,
  width = 96,
  height = 32,
  className,
  strokeClassName = 'stroke-violet-500',
  fillClassName = 'fill-violet-200/50',
}: SparklineProps) {
  if (values.length === 0) {
    return <div className={cn('h-8 w-24', className)} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <path d={areaPath} className={fillClassName} />
      <path
        d={linePath}
        fill="none"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={strokeClassName}
      />
      {(() => {
        const last = points[points.length - 1];
        if (!last) return null;
        return (
          <circle
            cx={last[0]}
            cy={last[1]}
            r={2.5}
            className={cn('fill-white', strokeClassName)}
            strokeWidth={1.5}
          />
        );
      })()}
    </svg>
  );
}
