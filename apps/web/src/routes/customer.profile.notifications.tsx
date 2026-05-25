import { createFileRoute } from '@tanstack/react-router';
import { Bell, Mail, MessageSquare, RotateCcw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import {
  type NotificationPreferences,
  defaultNotificationPreferences,
  usePersistedState,
} from '@/features/customer-profile/preferences';

export const Route = createFileRoute('/customer/profile/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  const [prefs, setPrefs] = usePersistedState<NotificationPreferences>(
    'petclinic.customer.notifications',
    defaultNotificationPreferences,
  );

  const update = <K extends keyof NotificationPreferences>(
    channel: K,
    key: keyof NotificationPreferences[K],
  ) => {
    setPrefs((p) => ({
      ...p,
      [channel]: { ...p[channel], [key]: !p[channel][key] },
    }));
  };

  const reset = () => {
    setPrefs(defaultNotificationPreferences);
    toast.success('Đã đặt lại tuỳ chọn mặc định');
  };

  return (
    <>
      <ProfilePageHeader
        title="Thông báo"
        subtitle="Chọn kênh và loại thông báo bạn muốn nhận."
        actions={
          <Button
            variant="outline"
            onClick={reset}
            className="rounded-xl border-[#E4DEFF] font-black text-[#6D5CE8]"
          >
            <RotateCcw /> Mặc định
          </Button>
        }
      />

      <ProfileCard>
        <CardTitleRow icon={Mail} title="Email" description="Gửi đến hộp thư đăng ký." />
        <div className="mt-5 divide-y divide-[#F0F0F7]">
          <ToggleRow
            label="Nhắc lịch khám"
            description="Gửi 24h và 2h trước lịch khám đã đặt."
            checked={prefs.email.appointmentReminder}
            onChange={() => update('email', 'appointmentReminder')}
          />
          <ToggleRow
            label="Tóm tắt sau khám"
            description="Báo cáo y tế + đơn thuốc gửi sau mỗi lượt khám hoàn thành."
            checked={prefs.email.visitSummary}
            onChange={() => update('email', 'visitSummary')}
          />
          <ToggleRow
            label="Khuyến mãi & tin tức"
            description="Ưu đãi vaccine, chương trình thẻ thành viên — không quá 2 email/tháng."
            checked={prefs.email.promotions}
            onChange={() => update('email', 'promotions')}
          />
        </div>
      </ProfileCard>

      <ProfileCard>
        <CardTitleRow
          icon={MessageSquare}
          title="SMS"
          description="Tin nhắn ngắn đến số điện thoại đã đăng ký."
        />
        <div className="mt-5 divide-y divide-[#F0F0F7]">
          <ToggleRow
            label="Nhắc lịch khám"
            description="Tin nhắn ngắn 30 phút trước giờ khám."
            checked={prefs.sms.appointmentReminder}
            onChange={() => update('sms', 'appointmentReminder')}
          />
          <ToggleRow
            label="Khẩn cấp (luôn bật)"
            description="Thay đổi đột xuất lịch hoặc cảnh báo y tế. Không tắt được vì lý do an toàn."
            checked={prefs.sms.emergency}
            onChange={() => update('sms', 'emergency')}
            disabled
          />
        </div>
      </ProfileCard>

      <ProfileCard>
        <CardTitleRow
          icon={Smartphone}
          title="Push & in-app"
          description="Thông báo trên trình duyệt + biểu tượng chuông."
        />
        <div className="mt-5">
          <ToggleRow
            label="Bật tất cả"
            description="Một toggle duy nhất cho thông báo push — chi tiết sẽ ra mắt cùng PWA install."
            checked={prefs.push.all}
            onChange={() => update('push', 'all')}
          />
        </div>
      </ProfileCard>

      <ProfileCard className="bg-gradient-to-r from-violet-50 to-white">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Bell className="size-4 text-[#7C6CF5]" />
          Lưu ý: tuỳ chọn hiện lưu local trên trình duyệt. Sync đa thiết bị sẽ bật khi BE
          expose endpoint{' '}
          <code className="rounded bg-violet-100 px-1">/users/me/preferences</code>.
        </div>
      </ProfileCard>
    </>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="mt-1 text-xs leading-5 font-medium text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? 'bg-[#7C6CF5]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
