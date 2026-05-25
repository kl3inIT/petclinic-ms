import { cn } from '@/lib/utils';

interface VetAvatarProps {
  firstName?: string;
  lastName?: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}

const SIZE_CLASS = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
  xl: 'size-28 text-4xl',
} as const;

export function VetAvatar({
  firstName,
  lastName,
  photoUrl,
  size = 'md',
  className,
  ring = false,
}: VetAvatarProps) {
  const initials = getInitials(firstName, lastName);
  const tone = pickTone(initials);

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold',
        SIZE_CLASS[size],
        ring && 'shadow-md ring-4 ring-white',
        tone.bg,
        tone.text,
        className,
      )}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Bác sĩ'}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}

function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || 'BS';
}

const TONES = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
] as const;

function pickTone(seed: string): (typeof TONES)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return TONES[Math.abs(hash) % TONES.length] ?? TONES[0];
}
