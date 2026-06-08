import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Globe2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import {
  LANGUAGES,
  type LanguageCode,
  usePersistedState,
} from '@/features/customer-profile/preferences';

export const Route = createFileRoute('/customer/profile/language')({
  component: LanguagePage,
});

function LanguagePage() {
  const [lang, setLang] = usePersistedState<LanguageCode>(
    'petclinic.customer.language',
    'vi',
  );

  return (
    <>
      <ProfilePageHeader
        title="Ngôn ngữ"
        subtitle="Chọn ngôn ngữ hiển thị cho giao diện và thông báo."
      />

      <ProfileCard>
        <CardTitleRow icon={Globe2} title="Ngôn ngữ giao diện" />
        <ul className="mt-5 space-y-2">
          {LANGUAGES.map((l) => {
            const selected = lang === l.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    toast.success(`Đã chọn ${l.label}`);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-primary bg-accent shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {l.flag}
                    </span>
                    <span>
                      <p className="text-sm font-black text-foreground">{l.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {l.code}
                      </p>
                    </span>
                  </div>
                  {selected ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <span className="size-5 rounded-full border-2 border-border" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </ProfileCard>

      <ProfileCard className="border-warning/30 bg-warning/5">
        <p className="text-sm font-medium text-muted-foreground">
          <span className="font-black text-foreground">Lưu ý:</span> bản preview hiện chỉ
          persist locale code. i18n đầy đủ (vi-VN + en-US) sẽ ra mắt cùng phase{' '}
          <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">
            i18next + locale negotiation
          </code>{' '}
          — giao diện chính vẫn hiển thị Tiếng Việt.
        </p>
      </ProfileCard>
    </>
  );
}
