import { createFileRoute } from '@tanstack/react-router';
import { Check, Globe2, Languages } from 'lucide-react';

import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import { ComingSoonCard } from '@/features/vet-settings/components/ComingSoonCard';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/vet/settings/language')({
  component: LanguagePage,
});

interface Lang {
  code: 'vi' | 'en';
  label: string;
  flag: string;
  ready: boolean;
}

const LANGUAGES: Lang[] = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', ready: true },
  { code: 'en', label: 'English', flag: '🇺🇸', ready: false },
];

function LanguagePage() {
  return (
    <>
      <ProfilePageHeader
        title="Ngôn ngữ"
        subtitle="Chọn ngôn ngữ hiển thị cho giao diện Vet Portal."
      />

      <ProfileCard>
        <CardTitleRow
          icon={Globe2}
          title="Ngôn ngữ hiển thị"
          description="Hiện tại Vet Portal mặc định tiếng Việt — các ngôn ngữ khác đang lên kế hoạch."
        />
        <ul className="mt-5 space-y-2">
          {LANGUAGES.map((l) => (
            <li
              key={l.code}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                l.ready
                  ? 'border-violet-200 bg-violet-50/40'
                  : 'border-slate-200 bg-white opacity-70',
              )}
            >
              <span className="text-xl">{l.flag}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-950">{l.label}</p>
                <p className="text-[11px] font-medium text-slate-500">
                  {l.ready ? 'Đang sử dụng' : 'Sẽ ra mắt cùng đợt i18n toàn hệ thống'}
                </p>
              </div>
              {l.ready ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-white">
                  <Check className="size-4" />
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                  Coming soon
                </span>
              )}
            </li>
          ))}
        </ul>
      </ProfileCard>

      <ComingSoonCard
        icon={Languages}
        title="Đa ngôn ngữ giao diện"
        description="Switch giữa Tiếng Việt và English (cùng các ngôn ngữ khu vực ASEAN) sẽ phát hành khi i18n pipeline toàn FE hoàn thiện — cần extract chuỗi tĩnh thành resource bundle và bổ sung locale formatter cho ngày/giờ/tiền tệ."
        blockers={[
          'i18n library (vd react-intl / lingui) wire vào TanStack Router',
          'Trích xuất chuỗi tĩnh khỏi 6 portal (admin, vet, customer, store, auth, public)',
          'Locale-aware date/number formatter (đổi DD/MM ↔ MM/DD)',
        ]}
      />
    </>
  );
}
