import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  ChevronDown,
  CircleHelp,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  CardTitleRow,
  ProfileCard,
  ProfilePageHeader,
} from '@/features/customer-profile/components/ProfilePageHeader';

export const Route = createFileRoute('/customer/profile/help')({
  component: HelpPage,
});

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    q: 'Làm sao để đặt lịch khám cho thú cưng?',
    a: 'Vào Tổng quan → bấm "Đặt lịch khám mới", chọn pet → chọn bác sĩ + thời gian → xác nhận. Lịch sẽ được gửi mail cho cả phòng khám và bạn.',
  },
  {
    q: 'Tôi có thể đổi/huỷ lịch khám không?',
    a: 'Có. Vào Lịch sử → tìm cuộc hẹn (status SCHEDULED) → bấm Huỷ. Sau khi cuộc hẹn chuyển IN_PROGRESS thì không huỷ được — liên hệ lễ tân 1900 8268.',
  },
  {
    q: 'Mật khẩu bị quên?',
    a: 'Bấm "Quên mật khẩu" ở trang đăng nhập, nhập email đã đăng ký. Hệ thống gửi link đặt lại trong 15 phút (hết hạn nếu không click).',
  },
  {
    q: 'Tại sao tôi không xem được trang Bác sĩ?',
    a: 'Trang /vet chỉ dành cho tài khoản có vai trò VET hoặc STAFF. Tài khoản khách hàng (USER) sẽ thấy trang 403.',
  },
  {
    q: 'Dữ liệu của tôi được bảo vệ thế nào?',
    a: 'Mật khẩu hash BCrypt 12 rounds, JWT phát hành 15 phút (access) + 7 ngày (refresh, single-use). Các endpoint PII đều cần token + per-instance check (USER chỉ xem hồ sơ của mình).',
  },
];

function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <>
      <ProfilePageHeader
        title="Trung tâm trợ giúp"
        subtitle="Câu hỏi thường gặp và kênh liên hệ với phòng khám."
      />

      <ProfileCard>
        <CardTitleRow icon={CircleHelp} title="Câu hỏi thường gặp" />
        <ul className="mt-5 space-y-2">
          {faqs.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <li
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-black text-foreground hover:bg-muted/50"
                  aria-expanded={isOpen}
                >
                  {f.q}
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-border bg-muted/40 px-4 py-3 text-sm leading-6 font-medium text-muted-foreground">
                    {f.a}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </ProfileCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ProfileCard>
          <CardTitleRow icon={Phone} title="Hotline 24/7" />
          <p className="mt-4 text-2xl font-black tracking-wider text-primary">
            1900 8268
          </p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Cuộc gọi miễn phí từ điện thoại cố định. Di động tính theo nhà mạng.
          </p>
        </ProfileCard>

        <ProfileCard>
          <CardTitleRow icon={Mail} title="Email hỗ trợ" />
          <a
            href="mailto:support@petclinic.local"
            className="mt-4 inline-block text-lg font-black text-primary underline-offset-4 hover:underline"
          >
            support@petclinic.local
          </a>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Trả lời trong 4 giờ làm việc (8h-18h, T2-T7).
          </p>
        </ProfileCard>

        <ProfileCard>
          <CardTitleRow icon={MessageCircle} title="Chat trực tuyến" />
          <Button
            className="mt-4 w-full rounded-xl font-black"
            disabled
            title="Sẽ enable cùng chatbot AI assistant"
          >
            Bắt đầu chat
          </Button>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Chatbot AI assistant đang chạy beta — hiện chỉ active ở phía admin.
          </p>
        </ProfileCard>

        <ProfileCard>
          <CardTitleRow icon={MapPin} title="Đến trực tiếp" />
          <p className="mt-4 text-sm font-bold text-foreground">PetClinic MSS301</p>
          <p className="mt-1 text-xs leading-5 font-medium text-muted-foreground">
            12 Lê Lợi, Quận 1, TP. Hồ Chí Minh
            <br />
            Mở cửa: 7h00 - 21h00, mọi ngày trong tuần
          </p>
        </ProfileCard>
      </div>
    </>
  );
}
