import { cn } from '@/lib/utils';

interface AreaTrendProps {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
  className?: string;
  gradientId?: string;
  strokeClassName?: string;
  yMin?: number;
  yMax?: number;
}

export function AreaTrend({
  values,
  labels,
  width = 560,
  height = 180,
  className,
  gradientId = 'vetTrendGradient',
  strokeClassName = 'stroke-violet-500',
  yMin,
  yMax,
}: AreaTrendProps) {
  if (values.length === 0) {
    return (
      <div
        className={cn(
          'flex h-44 items-center justify-center text-xs text-slate-400',
          className,
        )}
      >
        Chưa có dữ liệu để vẽ biểu đồ
      </div>
    );
  }

  const min = yMin ?? Math.min(...values);
  const max = yMax ?? Math.max(...values);
  const range = max - min || 1;
  const paddingX = 16;
  const paddingTop = 12;
  const paddingBottom = labels ? 22 : 12;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;
  const stepX = values.length > 1 ? chartW / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = paddingX + i * stepX;
    const y = paddingTop + chartH - ((v - min) / range) * chartH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${paddingX + chartW} ${paddingTop + chartH} L ${paddingX} ${paddingTop + chartH} Z`;

  const gridLines = [0.25, 0.5, 0.75].map((t) => paddingTop + chartH * t);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={cn('block', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

      {gridLines.map((y, i) => (
        <line
          key={i}
          x1={paddingX}
          x2={paddingX + chartW}
          y1={y}
          y2={y}
          strokeDasharray="2 4"
          className="stroke-slate-200"
          strokeWidth={1}
        />
      ))}

      <path d={areaPath} fill={`url(#${gradientId})`} className="text-violet-400" />
      <path
        d={linePath}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={strokeClassName}
      />

      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={2.5}
          className={cn('fill-white', strokeClassName)}
          strokeWidth={1.5}
        />
      ))}

      {labels &&
        labels.map((lbl, i) => {
          const x = paddingX + i * stepX;
          return (
            <text
              key={i}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              className="fill-slate-400"
            >
              {lbl}
            </text>
          );
        })}
    </svg>
  );
}
