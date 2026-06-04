import type { LucideIcon } from 'lucide-react';
import { Hourglass } from 'lucide-react';

import { ProfileCard } from '@/features/customer-profile/components/ProfilePageHeader';

interface Props {
  icon?: LucideIcon;
  title: string;
  description: string;
  blockers?: string[];
}

export function ComingSoonCard({
  icon: Icon = Hourglass,
  title,
  description,
  blockers,
}: Props) {
  return (
    <ProfileCard className="bg-gradient-to-br from-amber-50/60 via-white to-white">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm ring-1 ring-amber-200">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{title}</h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 font-medium text-slate-600">
            {description}
          </p>
          {blockers && blockers.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <p className="text-[11px] font-bold tracking-wide text-amber-800 uppercase">
                Phụ thuộc backend
              </p>
              <ul className="mt-2 space-y-1.5 text-xs font-medium text-slate-700">
                {blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProfileCard>
  );
}
