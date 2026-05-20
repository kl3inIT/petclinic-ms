import { Link, createFileRoute } from '@tanstack/react-router';
import {
  PawPrint,
  Stethoscope,
  Syringe,
  Scissors,
  Smile,
  ShoppingBag,
  Phone,
  Globe,
  Sparkles,
  Clock,
  HeartHandshake,
  CalendarCheck,
  ShieldCheck,
  Star,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isCustomer = user?.roles?.includes('USER') ?? false;
  const ctaHref = user ? (isCustomer ? '/customer/book' : '/admin/visits') : '/login';

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f6f7fc] to-white">
      <SiteHeader user={user} />
      <main>
        <Hero ctaHref={ctaHref} />
        <WhyChooseUs />
        <Services />
        <Testimonials />
        <CtaBanner ctaHref={ctaHref} />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────── Header ────────────────────────────── */

interface HeaderProps {
  user: ReturnType<typeof useAuthStore.getState>['user'];
}

function SiteHeader({ user }: HeaderProps) {
  const nav = [
    { label: 'Trang chủ', href: '#home' },
    { label: 'Về chúng tôi', href: '#about' },
    { label: 'Dịch vụ', href: '#services' },
    { label: 'Khách hàng', href: '#testimonials' },
    { label: 'Liên hệ', href: '#contact' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden gap-1.5 md:inline-flex">
            <Phone className="size-4" /> 1900 8268
          </Button>
          <Button variant="ghost" size="sm" className="hidden gap-1.5 md:inline-flex">
            <Globe className="size-4" /> VI
          </Button>
          {user ? (
            <Button asChild size="sm">
              <Link to={user.roles.includes('USER') ? '/customer' : '/admin'}>
                Trang của tôi
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/customer/book">Đặt lịch</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────── Hero ────────────────────────────── */

function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      id="home"
      className="relative scroll-mt-20 overflow-hidden px-6 pt-12 pb-24 sm:pt-16"
    >
      {/* paw decorations */}
      <PawDecor className="left-6 top-20 text-primary/30" rotate={-15} />
      <PawDecor className="left-20 top-44 text-primary/20" rotate={20} size="sm" />
      <PawDecor className="right-12 top-16 text-primary/30" rotate={25} />
      <PawDecor className="right-32 top-40 text-primary/20" rotate={-10} size="sm" />

      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-3 text-sm font-medium tracking-wide text-primary/80">
          Được pet-owner tin tưởng từ năm 2010
        </p>
        <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          CHĂM SÓC THÚ CƯNG
          <br />
          <span className="text-primary">NHƯ NGƯỜI THÂN</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Đội ngũ bác sĩ giàu kinh nghiệm, cơ sở vật chất hiện đại và hệ thống đặt
          lịch trực tuyến 24/7 cho thú cưng của bạn.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to={ctaHref}>
              <CalendarCheck className="size-5" />
              Đặt lịch khám ngay
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#services">Khám phá dịch vụ</a>
          </Button>
        </div>
      </div>

      {/* heart collage */}
      <div className="relative mx-auto mt-16 flex max-w-4xl items-end justify-center gap-3 sm:gap-5">
        <HeartImage
          src="https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&q=80&auto=format&fit=crop"
          alt="Mèo"
          className="h-44 w-32 -rotate-6 sm:h-56 sm:w-40"
        />
        <HeartImage
          src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80&auto=format&fit=crop"
          alt="Chó Golden"
          className="h-64 w-48 -translate-y-4 sm:h-80 sm:w-60"
          accent
        />
        <HeartImage
          src="https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=600&q=80&auto=format&fit=crop"
          alt="Vẹt"
          className="h-44 w-32 rotate-6 sm:h-56 sm:w-40"
        />
      </div>
    </section>
  );
}

function HeartImage({
  src,
  alt,
  className,
  accent = false,
}: {
  src: string;
  alt: string;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden border-4 border-white shadow-xl',
        accent ? 'ring-4 ring-primary/30' : '',
        className,
      )}
      style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
    >
      <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />
    </div>
  );
}

function PawDecor({
  className,
  rotate = 0,
  size = 'md',
}: {
  className?: string;
  rotate?: number;
  size?: 'sm' | 'md';
}) {
  return (
    <PawPrint
      className={cn(
        'pointer-events-none absolute hidden md:block',
        size === 'sm' ? 'size-8' : 'size-12',
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    />
  );
}

/* ─────────────────────────── Why Choose Us ─────────────────────────── */

function WhyChooseUs() {
  const ribbons = [
    {
      label: 'Thiết bị hiện đại',
      icon: Sparkles,
      color: 'from-amber-400 to-amber-500',
    },
    {
      label: 'Bác sĩ giàu kinh nghiệm',
      icon: Stethoscope,
      color: 'from-rose-400 to-rose-500',
    },
    {
      label: 'Cấp cứu 24/7',
      icon: Clock,
      color: 'from-emerald-400 to-emerald-500',
    },
    {
      label: 'Chi phí hợp lý',
      icon: HeartHandshake,
      color: 'from-indigo-400 to-indigo-500',
    },
  ];

  return (
    <section id="about" className="scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          VÌ SAO CHỌN CHÚNG TÔI?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Chúng tôi mang đến trải nghiệm chăm sóc tốt nhất cho thú cưng yêu quý của bạn
          với đội ngũ chuyên nghiệp và trang thiết bị tân tiến.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ribbons.map((r) => (
            <div
              key={r.label}
              className={cn(
                'group relative flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br p-6 text-white shadow-md transition-transform hover:-translate-y-1',
                r.color,
              )}
            >
              <div className="rounded-full bg-white/25 p-3">
                <r.icon className="size-7" />
              </div>
              <p className="text-base font-semibold">{r.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Services ─────────────────────────── */

function Services() {
  const services = [
    {
      icon: Stethoscope,
      title: 'Khám tổng quát',
      desc: 'Kiểm tra sức khỏe định kỳ, phát hiện sớm bệnh lý thường gặp.',
      color: 'bg-blue-500',
    },
    {
      icon: Syringe,
      title: 'Tiêm phòng',
      desc: 'Lịch vắc-xin đầy đủ, an toàn theo độ tuổi và giống loài.',
      color: 'bg-emerald-500',
    },
    {
      icon: Scissors,
      title: 'Grooming',
      desc: 'Tắm, cắt tỉa, vệ sinh — chuyên nghiệp, an toàn, thư giãn.',
      color: 'bg-rose-500',
    },
    {
      icon: Smile,
      title: 'Nha khoa',
      desc: 'Cạo cao răng, điều trị nướu, giữ răng miệng khỏe mạnh.',
      color: 'bg-amber-500',
    },
    {
      icon: ShoppingBag,
      title: 'Pet Shop',
      desc: 'Thức ăn cao cấp, phụ kiện và đồ chơi cho người bạn nhỏ.',
      color: 'bg-violet-500',
    },
  ];

  return (
    <section id="services" className="scroll-mt-20 bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <PawPrint className="size-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Dịch vụ
            </span>
            <PawPrint className="size-5" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            DỊCH VỤ CỦA CHÚNG TÔI
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Đa dạng dịch vụ thú y giúp thú cưng của bạn luôn khỏe mạnh và hạnh phúc.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
          {services.map((s) => (
            <div
              key={s.title}
              className="group rounded-2xl border bg-card p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={cn(
                  'mx-auto flex size-14 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110',
                  s.color,
                )}
              >
                <s.icon className="size-7" />
              </div>
              <h3 className="mt-4 text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Testimonials ─────────────────────────── */

function Testimonials() {
  const items = [
    {
      img: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=400&q=80&auto=format&fit=crop',
      title: 'Hành trình hồi phục của Buddy',
      body: 'Đội ngũ tại FeliVet thật tuyệt vời! Họ chăm sóc Buddy chu đáo trong suốt quá trình điều trị. Bác sĩ rất tận tâm.',
      author: 'Chị Sarah',
    },
    {
      img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80&auto=format&fit=crop',
      title: 'Khám sức khỏe của Luca',
      body: 'Quy trình chuyên nghiệp, môi trường sạch sẽ. Bé Luca rất thoải mái — sẽ tiếp tục tin tưởng phòng khám.',
      author: 'Anh Michael',
    },
    {
      img: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&q=80&auto=format&fit=crop',
      title: 'Trải nghiệm tốt nhất',
      body: 'Trải nghiệm tốt nhất tôi từng có. Đội ngũ giàu kinh nghiệm, giá hợp lý. Khuyên dùng cho mọi pet owner!',
      author: 'Chị Misty',
    },
    {
      img: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&q=80&auto=format&fit=crop',
      title: 'Cấp cứu tuyệt vời',
      body: 'Khi pet của tôi cần cấp cứu giữa đêm, FeliVet đã có mặt. Phản hồi nhanh, chăm sóc chuyên nghiệp. Cảm ơn rất nhiều!',
      author: 'Chị Nội',
    },
  ];

  return (
    <section id="testimonials" className="scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <PawPrint className="size-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Khách hàng
            </span>
            <PawPrint className="size-5" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            KHÁCH HÀNG NÓI GÌ
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Câu chuyện thật từ những pet owner đã tin tưởng giao thú cưng cho chúng tôi.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((t) => (
            <article
              key={t.title}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={t.img}
                  alt={t.author}
                  className="size-full object-cover transition-transform hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="space-y-2 p-4">
                <h3 className="text-sm font-bold">{t.title}</h3>
                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {t.body}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium">{t.author}</span>
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── CTA Banner ─────────────────────────── */

function CtaBanner({ ctaHref }: { ctaHref: string }) {
  return (
    <section id="contact" className="scroll-mt-20 px-6 pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[#6e64b9] p-10 text-center text-white shadow-xl sm:p-14">
        <ShieldCheck className="mx-auto size-12 opacity-90" />
        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          Sẵn sàng đặt lịch cho thú cưng?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/90">
          Chọn thú cưng, chọn bác sĩ, chọn thời gian — chúng tôi lo phần còn lại.
          Bạn sẽ nhận email xác nhận ngay sau khi đặt.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link to={ctaHref}>
              <CalendarCheck className="size-5" /> Đặt lịch ngay
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <a href="tel:19008268">
              <Phone className="size-5" /> Gọi 1900 8268
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t bg-white px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo size="sm" />
        <p className="text-xs text-muted-foreground">
          © 2026 PetClinic MSS301 — Mọi thú cưng đều xứng đáng được yêu thương.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href="#about" className="hover:text-foreground">
            Về chúng tôi
          </a>
          <a href="#services" className="hover:text-foreground">
            Dịch vụ
          </a>
          <a href="#contact" className="hover:text-foreground">
            Liên hệ
          </a>
        </div>
      </div>
    </footer>
  );
}
