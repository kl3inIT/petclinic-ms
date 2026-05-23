import { Link, createFileRoute } from '@tanstack/react-router';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  PawPrint,
  Stethoscope,
  Syringe,
  Scissors,
  Smile,
  ShoppingBag,
  Phone,
  Sparkles,
  Clock,
  CalendarCheck,
  Star,
  Activity,
  Heart,
  ChevronDown,
  Facebook,
  Instagram,
  Youtube,
  Mail,
  MapPin,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function roleHome(roles: string[] | undefined): string {
  if (!roles?.length) return '/login';
  if (roles.includes('USER')) return '/customer/book';
  if (roles.includes('VET')) return '/vet';
  return '/admin/visits';
}

function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const ctaHref = user ? roleHome(user.roles) : '/login';

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFF] font-sans text-slate-900 selection:bg-violet-200 selection:text-violet-900">
      <SiteHeader user={user} ctaHref={ctaHref} />
      <main>
        <Hero ctaHref={ctaHref} />
        <TrustStats />
        <WhyChooseUs />
        <Services />
        <Process />
        <FeaturedDoctors />
        <PetCareJourney />
        <Facilities />
        <Pricing ctaHref={ctaHref} />
        <Testimonials />
        <FAQ />
        <CtaBanner ctaHref={ctaHref} />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ────────────────────────────── Header ────────────────────────────── */

interface HeaderProps {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  ctaHref: string;
}

function SiteHeader({ user, ctaHref }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const nav = [
    { label: 'Trang chủ', href: '#home' },
    { label: 'Dịch vụ', href: '#services' },
    { label: 'Quy trình', href: '#process' },
    { label: 'Bác sĩ', href: '#team' },
    { label: 'Bảng giá', href: '#pricing' },
    { label: 'Đánh giá', href: '#testimonials' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full border-b transition-all duration-300',
        isScrolled
          ? 'border-slate-200/50 bg-white/80 py-3 shadow-sm backdrop-blur-lg'
          : 'border-transparent bg-transparent py-5',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[15px] font-semibold text-slate-600 transition-colors hover:text-violet-600"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/store"
            className="text-[15px] font-semibold text-slate-600 transition-colors hover:text-violet-600"
          >
            Cửa hàng
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="tel:18002424"
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[15px] font-bold text-slate-700 transition-colors hover:bg-slate-50 md:flex"
          >
            <Phone className="size-4 text-violet-600" />
            1800 2424
          </a>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-violet-600 px-6 font-bold shadow-lg shadow-violet-600/20 hover:bg-violet-700"
          >
            <Link to={ctaHref}>
              {user ? (
                'Trang của tôi'
              ) : (
                <>
                  <CalendarCheck className="mr-2 size-5" />
                  Đặt lịch ngay
                </>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────── Hero ────────────────────────────── */

function Hero({ ctaHref }: { ctaHref: string }) {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -50]);

  return (
    <section
      id="home"
      className="relative overflow-hidden px-6 pt-32 pb-20 lg:pt-40 lg:pb-32"
    >
      {/* Background Blobs */}
      <div className="pointer-events-none absolute top-0 left-0 -z-10 h-full w-full overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] h-[600px] w-[600px] rounded-full bg-violet-200/50 opacity-60 mix-blend-multiply blur-3xl" />
        <div className="absolute top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-teal-200/50 opacity-60 mix-blend-multiply blur-3xl" />
        <div className="absolute -bottom-[10%] left-[20%] h-[400px] w-[400px] rounded-full bg-pink-200/40 opacity-50 mix-blend-multiply blur-3xl" />
      </div>

      {/* Floating Paws */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[25%] left-[10%] -z-10 hidden lg:block"
      >
        <PawPrint className="size-16 rotate-[-15deg] text-violet-200/60" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[15%] right-[15%] -z-10 hidden lg:block"
      >
        <PawPrint className="size-24 rotate-[25deg] text-teal-200/50" />
      </motion.div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-2xl text-center lg:text-left"
        >
          <div className="mb-6 inline-flex items-center rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur-sm">
            <Heart className="mr-2 size-4 fill-violet-500 text-violet-500" />
            Phòng khám thú y cao cấp
          </div>

          <h1 className="text-5xl leading-[1.1] font-black tracking-tight text-slate-900 sm:text-6xl lg:text-[4rem]">
            Chăm sóc thú cưng
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-teal-500 bg-clip-text text-transparent">
              như người thân
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0">
            Đặt lịch khám nhanh, bác sĩ tận tâm, chăm sóc toàn diện cho chó mèo và thú
            cưng của bạn. Mang đến những điều tốt nhất cho những người bạn nhỏ.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Button
              asChild
              size="xl"
              className="w-full rounded-full bg-violet-600 px-8 py-6 text-base font-bold shadow-xl shadow-violet-600/25 transition-transform duration-300 hover:scale-105 hover:bg-violet-700 sm:w-auto"
            >
              <Link to={ctaHref}>
                <CalendarCheck className="mr-2 size-5" /> Đặt lịch khám ngay
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="xl"
              className="w-full rounded-full border-slate-300 bg-white/50 px-8 py-6 text-base font-bold text-slate-700 backdrop-blur-sm transition-all duration-300 hover:border-violet-300 hover:bg-white sm:w-auto"
            >
              <a href="#services">
                Xem dịch vụ <ChevronDown className="ml-2 size-5" />
              </a>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
            <Badge
              icon={Smile}
              text="10.000+"
              subtext="Tin tưởng"
              color="text-teal-600"
              bg="bg-teal-100"
            />
            <Badge
              icon={Clock}
              text="24/7"
              subtext="Hỗ trợ"
              color="text-amber-600"
              bg="bg-amber-100"
            />
            <Badge
              icon={Stethoscope}
              text="15+"
              subtext="Bác sĩ"
              color="text-violet-600"
              bg="bg-violet-100"
            />
          </div>
        </motion.div>

        {/* Right Image */}
        <div className="relative z-10 mt-10 lg:mt-0 lg:pl-10">
          <motion.div style={{ y: y1 }} className="relative mx-auto max-w-[500px]">
            {/* Main Image */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-[40px] border-8 border-white bg-white shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80&auto=format&fit=crop"
                alt="Chó và mèo đáng yêu"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Floating Elements */}
            <motion.div
              style={{ y: y2 }}
              className="absolute -bottom-6 -left-10 hidden items-center gap-4 rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-xl md:flex"
            >
              <div className="flex -space-x-3">
                <img
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"
                  alt="Customer"
                />
                <img
                  className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80"
                  alt="Customer"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-xs font-bold text-violet-700">
                  +2k
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-700">
                Khách hàng
                <br />
                hài lòng <Heart className="inline size-4 fill-rose-500 text-rose-500" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

interface BadgeProps {
  icon: React.ElementType;
  text: string;
  subtext: string;
  color: string;
  bg: string;
}

function Badge({ icon: Icon, text, subtext, color, bg }: BadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn('flex size-12 items-center justify-center rounded-2xl', bg, color)}
      >
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-lg leading-none font-bold text-slate-900">{text}</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtext}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Trust Stats ─────────────────────────── */

function TrustStats() {
  const stats = [
    {
      value: '10.000+',
      label: 'Lượt khám & điều trị',
      icon: PawPrint,
      color: 'text-violet-500',
    },
    { value: '15+', label: 'Bác sĩ thú y', icon: Stethoscope, color: 'text-teal-500' },
    { value: '24/7', label: 'Hỗ trợ tận tâm', icon: Clock, color: 'text-amber-500' },
    { value: '4.9/5', label: 'Đánh giá hài lòng', icon: Star, color: 'text-rose-500' },
  ];

  return (
    <section className="relative z-20 mx-auto -mt-10 max-w-6xl px-6 lg:-mt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-2 rounded-[32px] border border-slate-100/50 bg-white p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl md:grid-cols-4"
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col items-center justify-center p-4 text-center',
              i !== 3 && 'border-r border-slate-100',
            )}
          >
            <s.icon className={cn('mb-3 size-8', s.color)} />
            <p className="text-3xl font-black text-slate-900 lg:text-4xl">{s.value}</p>
            <p className="mt-2 text-sm font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── Why Choose Us ─────────────────────────── */

function WhyChooseUs() {
  const features = [
    {
      title: 'Bác sĩ giàu kinh nghiệm',
      desc: 'Đội ngũ bác sĩ thú y chuyên môn cao, nhiều năm kinh nghiệm.',
      icon: Stethoscope,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      title: 'Thiết bị hiện đại',
      desc: 'Trang thiết bị tiên tiến, phòng khám đạt chuẩn an toàn.',
      icon: Sparkles,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'Quy trình rõ ràng',
      desc: 'Quy trình khám chữa bệnh khoa học, minh bạch và hiệu quả.',
      icon: Activity,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      title: 'Chăm sóc tận tâm',
      desc: 'Luôn đặt sức khỏe và sự an toàn của thú cưng lên hàng đầu.',
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      title: 'Đặt lịch online',
      desc: 'Đặt lịch nhanh chóng, dễ dàng mọi lúc mọi nơi.',
      icon: CalendarCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Nhắc lịch tự động',
      desc: 'Hệ thống nhắc lịch tự động qua SMS & Email.',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <section className="bg-[#FAFAFF] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Vì sao chọn chúng tôi?
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Mang đến điều tốt nhất cho thú cưng
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-100/50"
            >
              <div
                className={cn(
                  'mb-6 inline-flex size-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110',
                  f.bg,
                  f.color,
                )}
              >
                <f.icon className="size-8" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">{f.title}</h3>
              <p className="leading-relaxed text-slate-600">{f.desc}</p>
            </motion.div>
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
      title: 'Khám tổng quát',
      desc: 'Kiểm tra sức khỏe định kỳ, tư vấn phác đồ điều trị.',
      img: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400&q=80',
      icon: Stethoscope,
      color: 'text-violet-500',
    },
    {
      title: 'Tiêm phòng',
      desc: 'Vắc-xin an toàn, nhập khẩu, bảo vệ bé yêu.',
      img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
      icon: Syringe,
      color: 'text-teal-500',
    },
    {
      title: 'Nha khoa',
      desc: 'Cạo vôi răng, điều trị nướu, giữ răng chắc khỏe.',
      img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80',
      icon: Smile,
      color: 'text-sky-500',
    },
    {
      title: 'Grooming & Spa',
      desc: 'Tắm gội, cắt tỉa lông, làm đẹp toàn diện.',
      img: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&q=80',
      icon: Scissors,
      color: 'text-pink-500',
    },
    {
      title: 'Siêu âm / X-Quang',
      desc: 'Chẩn đoán hình ảnh với máy móc hiện đại.',
      img: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=400&q=80',
      icon: Activity,
      color: 'text-indigo-500',
    },
    {
      title: 'Phẫu thuật',
      desc: 'Phẫu thuật an toàn, gây mê hồi sức chuyên sâu.',
      img: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=400&q=80',
      icon: ShieldCheck,
      color: 'text-rose-500',
    },
    {
      title: 'Pet Shop',
      desc: 'Thức ăn cao cấp, phụ kiện chính hãng.',
      img: 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&q=80',
      icon: ShoppingBag,
      color: 'text-amber-500',
    },
    {
      title: 'Lưu trú',
      desc: 'Khách sạn thú cưng tiện nghi, chăm sóc tận tình.',
      img: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=400&q=80',
      icon: PawPrint,
      color: 'text-emerald-500',
    },
  ];

  return (
    <section id="services" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Dịch vụ đa dạng
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Chăm sóc toàn diện cho bé
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="group relative overflow-hidden rounded-[32px] border border-slate-100 bg-[#FAFAFF] transition-all duration-300 hover:border-violet-100 hover:shadow-xl"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={s.img}
                  alt={s.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div
                  className={cn(
                    'absolute top-4 right-4 rounded-xl bg-white p-2 shadow-sm',
                    s.color,
                  )}
                >
                  <s.icon className="size-5" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-2 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{s.desc}</p>
                {s.title === 'Pet Shop' ? (
                  <Button
                    asChild
                    variant="link"
                    className="mt-4 h-auto p-0 font-bold text-violet-600"
                  >
                    <Link to="/store">
                      Vào cửa hàng <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Process ─────────────────────────── */

function Process() {
  const steps = [
    { icon: PawPrint, title: 'Chọn thú cưng', desc: 'Chọn bé cưng cần chăm sóc.' },
    { icon: Calendar, title: 'Chọn thời gian', desc: 'Chọn bác sĩ và giờ thuận tiện.' },
    { icon: CheckCircle2, title: 'Xác nhận', desc: 'Nhận SMS/Email xác nhận lịch.' },
    { icon: Heart, title: 'Đến khám', desc: 'Đưa bé đến và trải nghiệm dịch vụ.' },
  ];

  return (
    <section
      id="process"
      className="relative overflow-hidden bg-gradient-to-b from-[#FAFAFF] to-white px-6 py-24"
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-20 max-w-2xl text-center"
        >
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Quy trình đơn giản
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Đặt lịch chỉ với 4 bước
          </h2>
        </motion.div>

        <div className="relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 right-[10%] left-[10%] hidden h-[2px] -translate-y-1/2 bg-slate-200 md:block">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="h-full bg-violet-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-4 md:gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="group relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-6 flex size-20 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-2 group-hover:border-violet-400 group-hover:shadow-violet-200/50">
                  <s.icon className="size-8 text-violet-600" />
                  <div className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full border-4 border-[#FAFAFF] bg-violet-600 font-bold text-white">
                    {i + 1}
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Featured Doctors ─────────────────────────── */

function FeaturedDoctors() {
  const team = [
    {
      name: 'BS. Thanh Nguyễn',
      role: 'Ngoại khoa thú y',
      exp: '7 năm kinh nghiệm',
      rating: '4.9',
      img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    },
    {
      name: 'BS. Hương Trần',
      role: 'Nội khoa',
      exp: '6 năm kinh nghiệm',
      rating: '4.8',
      img: 'https://images.unsplash.com/photo-1594824432258-2900a3d463ba?w=400&q=80',
    },
    {
      name: 'BS. Quân Lê',
      role: 'Chẩn đoán hình ảnh',
      exp: '5 năm kinh nghiệm',
      rating: '4.9',
      img: 'https://images.unsplash.com/photo-1537368910025-7028a4ce1010?w=400&q=80',
    },
    {
      name: 'BS. Mai Phạm',
      role: 'Da liễu thú cưng',
      exp: '8 năm kinh nghiệm',
      rating: '4.8',
      img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    },
  ];

  return (
    <section id="team" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-end justify-between gap-6 md:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
              Đội ngũ bác sĩ
            </p>
            <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
              Chuyên gia tận tâm
            </h2>
          </motion.div>
          <Button variant="outline" className="rounded-full border-slate-200">
            Xem tất cả bác sĩ
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group overflow-hidden rounded-[32px] border border-slate-100 bg-[#FAFAFF] transition-all duration-300 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50"
            >
              <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                <img
                  src={t.img}
                  alt={t.name}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-100 bg-white px-2 py-1 text-sm font-bold text-slate-700 shadow-sm">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {t.rating}
                  </div>
                </div>
                <p className="mb-4 text-sm font-medium text-violet-600">{t.role}</p>
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
                  <span className="text-xs font-medium text-slate-500">{t.exp}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                  >
                    Xem hồ sơ <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Pet Care Journey ─────────────────────────── */

function PetCareJourney() {
  return (
    <section className="relative overflow-hidden bg-violet-900 py-24 text-white">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay">
        <div className="absolute top-0 right-0 h-[800px] w-[800px] translate-x-1/3 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-400 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/3 rounded-full bg-gradient-to-tr from-teal-400 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:w-1/2"
        >
          <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-violet-200 backdrop-blur-md">
            <Heart className="mr-2 size-4 fill-pink-400 text-pink-400" />
            Hành trình sức khỏe
          </div>
          <h2 className="mb-6 text-3xl leading-tight font-black md:text-5xl">
            Không chỉ khám bệnh — chúng tôi đồng hành.
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-violet-200">
            Mỗi thú cưng là một thành viên trong gia đình. Chúng tôi thiết kế lộ trình
            chăm sóc sức khỏe trọn đời, từ lúc bé mới về nhà cho đến khi trưởng thành khỏe
            mạnh.
          </p>

          <ul className="space-y-5">
            {[
              'Phòng bệnh chủ động (Vaccine, tẩy giun)',
              'Theo dõi sức khỏe định kỳ',
              'Điều trị chuyên sâu, tận gốc',
              'Chăm sóc phục hồi sau khám',
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-4 text-lg font-medium text-white"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500 shadow-lg shadow-teal-500/30">
                  <CheckCircle2 className="size-5 text-white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative lg:w-1/2"
        >
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80"
              className="h-64 w-full rounded-[32px] rounded-tl-[64px] object-cover shadow-2xl"
              alt="Vet examining dog"
            />
            <img
              src="https://images.unsplash.com/photo-1527362950785-f487a7c1fe48?w=400&q=80"
              className="mt-8 h-64 w-full rounded-[32px] rounded-br-[64px] object-cover shadow-2xl"
              alt="Happy dog"
            />
          </div>

          {/* Floating badge */}
          <div className="absolute top-1/2 left-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 rotate-12 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <span className="text-3xl font-black text-white">100%</span>
            <span className="mt-1 text-xs font-bold tracking-widest text-violet-200 uppercase">
              Yêu thương
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Facilities ─────────────────────────── */

function Facilities() {
  return (
    <section className="overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Cơ sở vật chất
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Môi trường an toàn, hiện đại
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="group relative h-64 overflow-hidden rounded-[32px] md:col-span-2">
            <img
              src="https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=800&q=80"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Phòng phẫu thuật"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-xl font-bold">Phòng phẫu thuật vô trùng</h3>
            </div>
          </div>
          <div className="group relative h-64 overflow-hidden rounded-[32px]">
            <img
              src="https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=400&q=80"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Phòng xét nghiệm"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-xl font-bold">Lab xét nghiệm</h3>
            </div>
          </div>
          <div className="group relative h-64 overflow-hidden rounded-[32px]">
            <img
              src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&q=80"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Khu Grooming"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-xl font-bold">Khu Grooming & Spa</h3>
            </div>
          </div>
          <div className="group relative h-64 overflow-hidden rounded-[32px] md:col-span-2">
            <img
              src="https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=800&q=80"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Khu lưu trú"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="text-xl font-bold">Khu lưu trú tiện nghi</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Pricing ─────────────────────────── */

function Pricing({ ctaHref }: { ctaHref: string }) {
  const plans = [
    {
      name: 'Khám cơ bản',
      price: '150.000đ',
      features: ['Khám tổng quát', 'Tư vấn dinh dưỡng', 'Cân đo, kiểm tra nhiệt độ'],
      popular: false,
    },
    {
      name: 'Chăm sóc định kỳ',
      price: '450.000đ',
      features: [
        'Khám tổng quát',
        'Tiêm phòng 7 bệnh',
        'Tẩy giun sán',
        'Nhắc lịch tự động',
      ],
      popular: true,
    },
    {
      name: 'Gói toàn diện',
      price: '950.000đ',
      features: [
        'Khám tổng quát & Tiêm phòng',
        'Xét nghiệm máu cơ bản',
        'Siêu âm ổ bụng',
        'Làm sạch tai & cắt móng',
      ],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="bg-[#FAFAFF] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Bảng giá tham khảo
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Gói dịch vụ phổ biến
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3 lg:px-12">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'relative flex flex-col rounded-[40px] p-8 transition-all duration-300',
                p.popular
                  ? 'z-10 bg-violet-600 py-12 text-white shadow-2xl shadow-violet-600/30 md:scale-105'
                  : 'border border-slate-100 bg-white text-slate-900 shadow-sm hover:shadow-xl',
              )}
            >
              {p.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400 px-4 py-1.5 text-xs font-bold tracking-wider text-teal-950 uppercase shadow-sm">
                  Được chọn nhiều nhất
                </div>
              )}
              <h3 className="mt-2 text-xl font-bold">{p.name}</h3>
              <p
                className={cn(
                  'my-6 text-4xl font-black',
                  p.popular ? 'text-white' : 'text-violet-600',
                )}
              >
                {p.price}
              </p>

              <ul className="mb-10 flex-1 space-y-4">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2
                      className={cn(
                        'size-5',
                        p.popular ? 'text-teal-400' : 'text-violet-500',
                      )}
                    />{' '}
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={p.popular ? 'default' : 'outline'}
                className={cn(
                  'w-full rounded-full py-6 text-base font-bold transition-transform hover:scale-105',
                  p.popular
                    ? 'bg-white text-violet-700 hover:bg-slate-50'
                    : 'border-violet-200 text-violet-600 hover:bg-violet-50',
                )}
              >
                <Link to={ctaHref}>Đặt lịch gói này</Link>
              </Button>
            </motion.div>
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
      img: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=400&q=80',
      body: 'Phòng khám sạch sẽ, bác sĩ siêu nhẹ nhàng. Bé Miu nhà mình không hề sợ hãi khi đi tiêm.',
      author: 'Thu Hà & Miu Miu',
    },
    {
      img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
      body: 'Dịch vụ grooming đỉnh cao, bé Oreo được cắt tỉa siêu đáng yêu. Sẽ ủng hộ MS501 lâu dài!',
      author: 'Minh Đức & Oreo',
    },
    {
      img: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&q=80',
      body: 'Bé cún bị ốm lúc nửa đêm, may có phòng khám cấp cứu kịp thời. Cảm ơn các bác sĩ rất nhiều.',
      author: 'Quỳnh Anh & Đốm',
    },
  ];

  return (
    <section id="testimonials" className="overflow-hidden bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Khách hàng nói gì
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Yêu thương từ khách hàng
          </h2>
        </div>

        <div
          className="-mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-8 lg:m-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:p-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex min-w-[85vw] snap-center flex-col rounded-[40px] border border-slate-100 bg-[#FAFAFF] p-8 sm:min-w-[400px] lg:min-w-0"
            >
              <div className="mb-6 flex gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-5 fill-current" />
                ))}
              </div>
              <p className="mb-8 flex-1 text-lg leading-relaxed font-medium text-slate-700">
                "{t.body}"
              </p>
              <div className="mt-auto flex items-center gap-4">
                <img
                  src={t.img}
                  alt={t.author}
                  className="size-14 rounded-full border-2 border-white object-cover shadow-sm"
                />
                <p className="font-bold text-slate-900">{t.author}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */

function FAQ() {
  const faqs = [
    {
      q: 'Có cần đặt lịch trước không?',
      a: 'Để đảm bảo không phải chờ đợi lâu, bạn nên đặt lịch trước qua website hoặc hotline.',
    },
    {
      q: 'Phòng khám có khám ngoài giờ không?',
      a: 'Chúng tôi có trực cấp cứu 24/7. Vui lòng gọi trực tiếp hotline để được hỗ trợ khẩn cấp.',
    },
    {
      q: 'Có tiêm phòng cho chó mèo con không?',
      a: 'Có, chúng tôi cung cấp đầy đủ các loại vaccine theo tiêu chuẩn từ 6 tuần tuổi.',
    },
    {
      q: 'Thanh toán như thế nào?',
      a: 'Chúng tôi chấp nhận tiền mặt, thẻ ngân hàng, chuyển khoản và các ví điện tử phổ biến.',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#FAFAFF] px-6 py-24">
      <PawPrint className="absolute bottom-20 left-10 size-64 rotate-[-20deg] text-violet-100/50" />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h2 className="mb-12 text-3xl font-black text-slate-900 md:text-4xl">
          Câu hỏi thường gặp
        </h2>

        <div className="space-y-4 text-left">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-6 text-lg font-bold text-slate-900 select-none">
                {f.q}
                <span className="rounded-full bg-violet-50 p-1 text-violet-600 transition group-open:rotate-180">
                  <ChevronDown className="size-5" />
                </span>
              </summary>
              <div className="px-6 pb-6 font-medium text-slate-600">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── CTA Banner ─────────────────────────── */

function CtaBanner({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="bg-white px-6 py-12 lg:py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[48px] bg-gradient-to-br from-violet-600 via-violet-600 to-teal-500 p-10 shadow-2xl shadow-violet-600/20 lg:p-20"
      >
        <div className="pointer-events-none absolute top-0 right-0 h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <PawPrint className="absolute -right-10 -bottom-10 size-64 rotate-12 text-white/10" />

        <div className="relative z-10 mx-auto max-w-2xl text-center text-white">
          <h2 className="mb-6 text-4xl leading-tight font-black md:text-5xl">
            Sẵn sàng đặt lịch cho bé yêu?
          </h2>
          <p className="mb-10 text-lg font-medium text-violet-100">
            Chọn thú cưng, chọn bác sĩ, chọn thời gian — chúng tôi lo phần còn lại.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-10 py-7 font-bold text-violet-700 shadow-xl transition-transform hover:scale-105 hover:bg-slate-50"
            >
              <Link to={ctaHref}>
                <CalendarCheck className="mr-2 size-5" /> Đặt lịch ngay
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/30 bg-white/10 px-10 py-7 font-bold text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
            >
              <a href="tel:18002424">
                <Phone className="mr-2 size-5" /> Gọi hotline
              </a>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */

function SiteFooter() {
  return (
    <footer className="mt-10 rounded-t-[40px] bg-slate-900 px-6 pt-20 pb-10 text-slate-300 lg:mt-0">
      <div className="mx-auto mb-16 grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-6 flex items-center gap-2 text-white">
            <div className="rounded-xl bg-violet-600 p-2">
              <PawPrint className="size-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight">MS501 PetCare</span>
          </div>
          <p className="mb-6 text-sm leading-relaxed font-medium text-slate-400">
            Phòng khám thú y uy tín, chuyên nghiệp. Mang đến dịch vụ chăm sóc tốt nhất cho
            người bạn nhỏ của bạn.
          </p>
          <div className="flex gap-3">
            <a
              href="#"
              className="rounded-xl bg-white/5 p-2.5 transition-all hover:bg-violet-600 hover:text-white"
            >
              <Facebook className="size-4" />
            </a>
            <a
              href="#"
              className="rounded-xl bg-white/5 p-2.5 transition-all hover:bg-violet-600 hover:text-white"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="#"
              className="rounded-xl bg-white/5 p-2.5 transition-all hover:bg-violet-600 hover:text-white"
            >
              <Youtube className="size-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-6 text-lg font-bold text-white">DỊCH VỤ</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Khám tổng quát
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Tiêm phòng
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Grooming & Spa
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Lưu trú thú cưng
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 text-lg font-bold text-white">HỖ TRỢ</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Câu hỏi thường gặp
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Chính sách bảo mật
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Điều khoản sử dụng
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-violet-400">
                Liên hệ
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-6 text-lg font-bold text-white">LIÊN HỆ</h4>
          <ul className="mb-8 space-y-4 text-sm font-medium">
            <li className="flex items-start gap-3">
              <MapPin className="size-5 shrink-0 text-violet-400" /> 123 Nguyễn Trãi,
              Thanh Xuân, Hà Nội
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-5 shrink-0 text-violet-400" /> 1800 2424
            </li>
            <li className="flex items-center gap-3">
              <Mail className="size-5 shrink-0 text-violet-400" /> hi@ms501.vn
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-sm font-medium text-slate-500 md:flex-row">
        <p>© 2026 MS501 PetCare. All rights reserved.</p>
        <p>
          Made with <Heart className="inline size-4 fill-rose-500 text-rose-500" /> for
          pets.
        </p>
      </div>
    </footer>
  );
}
