import { createFileRoute } from '@tanstack/react-router';
import { Bell, Calendar, Mail, RotateCcw, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import { usePersistedState } from '@/features/customer-profile/preferences';
import {
  type VetNotificationPreferences,
  defaultVetNotificationPreferences,
} from '@/features/vet-settings/preferences';

export const Route = createFileRoute('/vet/settings/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  const [prefs, setPrefs] = usePersistedState<VetNotificationPreferences>(
    'petclinic.vet.notifications',
    defaultVetNotificationPreferences,
  );

  const update = <K extends keyof VetNotificationPreferences>(
    channel: K,
    key: keyof VetNotificationPreferences[K],
  ) => {
    setPrefs((p) => ({
      ...p,
      [channel]: { ...p[channel], [key]: !p[channel][key] },
    }));
  };

  const reset = () => {
    setPrefs(defaultVetNotificationPreferences);
    toast.success('Đã đặt lại tuỳ chọn mặc định');
  };

  return (
    <>
      <ProfilePageHeader
        title="Thông báo"
        subtitle="Chọn loại thông báo bạn muốn nhận khi có lịch hẹn, đánh giá hoặc thay đổi lịch trực."
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
        <CardTitleRow
          icon={Mail}
          title="Email"
          description="Gửi tới email đăng ký của bạn."
        />
        <div className="mt-5 divide-y divide-[#F0F0F7]">
          <ToggleRow
            label="Lịch khám mới được phân công"
            description="Gửi ngay khi staff/admin chỉ định lịch khám cho bạn."
            checked={prefs.email.newAppointment}
            onChange={() => update('email', 'newAppointment')}
          />
          <ToggleRow
            label="Lịch khám bị huỷ"
            description="Báo cáo các lượt khám đã được khách hàng / staff huỷ."
            checked={prefs.email.appointmentCancelled}
            onChange={() => update('email', 'appointmentCancelled')}
          />
          <ToggleRow
            label="Đánh giá mới từ khách hàng"
            description="Nhận email mỗi khi có rating mới (kèm bình luận nếu có)."
            checked={prefs.email.customerRating}
            onChange={() => update('email', 'customerRating')}
          />
          <ToggleRow
            label="Tóm tắt tuần"
            description="Tổng kết lịch hẹn, điểm rating trung bình và badge mới mỗi sáng thứ Hai."
            checked={prefs.email.weeklyDigest}
            onChange={() => update('email', 'weeklyDigest')}
          />
        </div>
      </ProfileCard>

      <ProfileCard>
        <CardTitleRow
          icon={Bell}
          title="Trong ứng dụng"
          description="Thông báo hiển thị trên trình duyệt khi bạn đang online."
        />
        <div className="mt-5 divide-y divide-[#F0F0F7]">
          <ToggleRow
            label="Lịch khám mới"
            description="Toast + biểu tượng chuông khi có lịch khám được phân công."
            icon={Calendar}
            checked={prefs.inApp.newAppointment}
            onChange={() => update('inApp', 'newAppointment')}
          />
          <ToggleRow
            label="Thay đổi lịch trực"
            description="Khi staff cập nhật khung trực hoặc lịch ngày nghỉ."
            icon={Calendar}
            checked={prefs.inApp.scheduleChange}
            onChange={() => update('inApp', 'scheduleChange')}
          />
          <ToggleRow
            label="Đạt huy hiệu mới"
            description="Pop-up chúc mừng khi bạn đạt badge mới."
            icon={Star}
            checked={prefs.inApp.badgeEarned}
            onChange={() => update('inApp', 'badgeEarned')}
          />
        </div>
      </ProfileCard>

      <ProfileCard className="bg-gradient-to-r from-violet-50 to-white">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <Sparkles className="size-4 text-[#7C6CF5]" />
          Tuỳ chọn được lưu cục bộ trên trình duyệt. Đồng bộ đa thiết bị + gửi email/push
          thực sẽ bật khi backend expose endpoint{' '}
          <code className="rounded bg-violet-100 px-1">
            /api/v1/vet-me/preferences
          </code>{' '}
          và pipeline mailer-service mở rộng cho domain vet.
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
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Icon className="size-3.5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{label}</p>
          <p className="mt-1 text-xs leading-5 font-medium text-slate-500">
            {description}
          </p>
        </div>
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
