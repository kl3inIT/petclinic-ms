import { createFileRoute } from '@tanstack/react-router';
import { Eye, EyeOff, KeyRound, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';
import { ComingSoonCard } from '@/features/vet-settings/components/ComingSoonCard';

export const Route = createFileRoute('/vet/settings/security')({
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <>
      <ProfilePageHeader
        title="Bảo mật & mật khẩu"
        subtitle="Quản lý mật khẩu, phiên đăng nhập và xác thực hai bước."
      />

      <ComingSoonCard
        icon={KeyRound}
        title="Đổi mật khẩu"
        description="Trang đổi mật khẩu sẽ ra mắt khi backend expose endpoint xác thực mật khẩu hiện tại + cập nhật. Hiện tại, vui lòng liên hệ admin nếu cần đổi gấp."
        blockers={[
          'POST /api/v1/vet-me/change-password (auth-service hoặc users-service)',
          'Yêu cầu mật khẩu cũ + mật khẩu mới (8+ ký tự, có chữ hoa & số)',
          'Sau khi đổi: invalidate tất cả refresh token hiện hành',
        ]}
      />

      <ProfileCard className="opacity-60">
        <CardTitleRow
          icon={KeyRound}
          title="Mật khẩu (preview UI)"
          description="UI demo — chưa gửi request thật. Khoá lại sau khi BE sẵn sàng."
        />
        <PasswordFormPreview />
      </ProfileCard>

      <ComingSoonCard
        icon={ShieldCheck}
        title="Xác thực hai bước (2FA)"
        description="Bật mã xác thực qua ứng dụng (TOTP — Google Authenticator, Authy) để bảo vệ tài khoản. Sẽ phát hành sau khi pipeline đổi mật khẩu hoàn thiện."
        blockers={[
          'Lưu shared secret + xác thực TOTP backend-side',
          'Recovery codes (one-time use)',
        ]}
      />

      <ComingSoonCard
        icon={ShieldQuestion}
        title="Quản lý phiên đăng nhập"
        description="Xem danh sách thiết bị đã đăng nhập, đăng xuất khỏi 1 thiết bị cụ thể, hoặc đăng xuất tất cả thiết bị khác."
        blockers={[
          'GET /api/v1/vet-me/sessions (liệt kê refresh token còn hiệu lực)',
          'DELETE /api/v1/vet-me/sessions/{id} (revoke 1 phiên)',
        ]}
      />
    </>
  );
}

function PasswordFormPreview() {
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  return (
    <form className="mt-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
      <PreviewField
        label="Mật khẩu hiện tại"
        type={show.current ? 'text' : 'password'}
        onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
        visible={show.current}
      />
      <PreviewField
        label="Mật khẩu mới"
        type={show.next ? 'text' : 'password'}
        onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
        visible={show.next}
        hint="Tối thiểu 8 ký tự, có chữ hoa và số."
      />
      <PreviewField
        label="Xác nhận mật khẩu mới"
        type={show.confirm ? 'text' : 'password'}
        onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
        visible={show.confirm}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled className="rounded-xl">
          Đổi mật khẩu (chưa khả dụng)
        </Button>
      </div>
    </form>
  );
}

function PreviewField({
  label,
  type,
  onToggle,
  visible,
  hint,
}: {
  label: string;
  type: 'text' | 'password';
  onToggle: () => void;
  visible: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold tracking-wide text-slate-700 uppercase">
        {label}
      </Label>
      <div className="relative">
        <Input type={type} disabled placeholder="••••••••" className="h-11 pr-10" />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Ẩn' : 'Hiện'}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
