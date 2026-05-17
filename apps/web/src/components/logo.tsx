import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
}

const sizeMap = {
  sm: { icon: 'h-8 w-8', text: 'text-base' },
  md: { icon: 'h-10 w-10', text: 'text-xl' },
  lg: { icon: 'h-14 w-14', text: 'text-3xl' },
  xl: { icon: 'h-20 w-20', text: 'text-5xl' },
} as const;

/**
 * Composite brand logo: mascot icon + textual wordmark.
 * Mascot SVG lifted từ jmix-petclinic-2; wordmark rebuilt bằng HTML text
 * để dễ đổi tên team mà không cần edit SVG paths.
 *
 * Colors khớp brand gốc:
 *   - purple `#6356c0` cho tên team
 *   - orange `#fab12b` cho "Petclinic"
 */
export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/brand/petclinic-logo.svg"
        alt="PetClinic"
        className={cn(s.icon, 'shrink-0')}
      />
      {variant === 'full' ? (
        <div
          className={cn(
            'flex items-baseline gap-1.5 font-extrabold tracking-tight leading-none',
            s.text,
          )}
        >
          <span className="text-[#6356c0]">MSS301</span>
          <span className="font-semibold text-[#fab12b]">Petclinic</span>
        </div>
      ) : null}
    </div>
  );
}
