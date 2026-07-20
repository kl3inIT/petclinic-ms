import { Link, createFileRoute } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  PawPrint,
  Stethoscope,
  Scissors,
  Phone,
  Clock,
  CalendarCheck,
  Star,
  Activity,
  Heart,
  ChevronDown,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useEffect } from 'react';

import { getPortalHref, PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import { LandingImage } from '@/features/landing/components/LandingImage';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const ctaHref = user ? getPortalHref(user.roles) : '/login';

  useEffect(() => {
    document.documentElement.classList.add('landing-scrollbar-hidden');
    document.body.classList.add('landing-scrollbar-hidden');

    return () => {
      document.documentElement.classList.remove('landing-scrollbar-hidden');
      document.body.classList.remove('landing-scrollbar-hidden');
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFF] font-sans text-slate-900 selection:bg-violet-200 selection:text-violet-900">
      <PublicHeader activePage="home" />
      <main>
        <Hero ctaHref={ctaHref} />
        <TrustStats />
        <WhyChooseUs />
        <Services />
        <Process />
        <FeaturedDoctors />
        <CareJourney />
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

/* ────────────────────────────── Hero ────────────────────────────── */

function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      id="home"
      className="relative flex min-h-[760px] items-center overflow-hidden pt-20"
    >
      <LandingImage
        src="/images/landing/hospital-hero-v2.jpg"
        alt="Không gian bệnh viện thú y MSS301 Petclinic"
        className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        width={1792}
        height={1024}
        fetchPriority="high"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md">
            <ShieldCheck className="mr-2 size-4 text-teal-300" />
            Bệnh viện thú y hiện đại · Chăm sóc 24/7
          </div>

          <h1 className="max-w-3xl text-5xl leading-[1.05] font-black tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Chăm sóc chuyên sâu,
            <span className="block text-teal-300">tận tâm như người nhà</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed font-medium text-slate-200 sm:text-xl">
            MSS301 Petclinic kết hợp đội ngũ bác sĩ giàu kinh nghiệm, quy trình minh bạch
            và hệ thống chẩn đoán hiện đại để đồng hành cùng thú cưng ở mọi giai đoạn.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              size="xl"
              className="w-full rounded-full bg-violet-600 px-8 py-6 text-base font-bold shadow-xl shadow-violet-950/30 hover:bg-violet-500 sm:w-auto"
            >
              <Link to={ctaHref}>
                <CalendarCheck className="mr-2 size-5" /> Đặt lịch khám ngay
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="xl"
              className="w-full rounded-full border-white/35 bg-white/10 px-8 py-6 text-base font-bold text-white backdrop-blur-md hover:bg-white hover:text-slate-950 sm:w-auto"
            >
              <a href="#services">
                Khám phá dịch vụ <ChevronDown className="ml-2 size-5" />
              </a>
            </Button>
          </div>

          <div className="mt-12 grid max-w-2xl gap-3 text-sm font-bold text-white sm:grid-cols-3">
            {[
              { icon: Stethoscope, label: '15+ bác sĩ chuyên khoa' },
              { icon: Clock, label: 'Tiếp nhận cấp cứu 24/7' },
              { icon: ShieldCheck, label: 'Quy trình an toàn' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/30 px-4 py-3 backdrop-blur-md"
              >
                <item.icon className="size-5 shrink-0 text-teal-300" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
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
        viewport={{ once: false, amount: 0.22 }}
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
  const reasons = [
    {
      title: 'Bác sĩ giàu kinh nghiệm',
      desc: 'Hồ sơ chuyên môn rõ ràng, phối hợp hội chẩn khi ca bệnh cần nhiều chuyên khoa.',
    },
    {
      title: 'Thiết bị hiện đại',
      desc: 'Xét nghiệm, chẩn đoán hình ảnh và phòng phẫu thuật được tổ chức ngay tại clinic.',
    },
    {
      title: 'Quy trình rõ ràng',
      desc: 'Tình trạng, lựa chọn điều trị và chi phí dự kiến được trao đổi trước khi thực hiện.',
    },
  ];

  return (
    <section className="bg-[#F7F7FC] px-6 py-28">
      <div className="mx-auto grid max-w-7xl items-stretch gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.22 }}
          className="relative min-h-[480px] overflow-hidden rounded-[36px] bg-slate-200"
        >
          <LandingImage
            src="/images/landing/why-care-v2.jpg"
            alt="Bác sĩ trao đổi kế hoạch chăm sóc với chủ thú cưng"
            className="absolute inset-0 h-full w-full object-cover"
            width={1365}
            height={1024}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
          <div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-6 text-white">
            <div>
              <p className="text-sm font-bold tracking-widest text-teal-300 uppercase">
                Đồng hành lâu dài
              </p>
              <p className="mt-2 max-w-sm text-2xl font-black">
                Mọi quyết định đều được giải thích rõ ràng
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-center backdrop-blur-md">
              <p className="text-2xl font-black">4.9/5</p>
              <p className="text-xs font-semibold text-slate-200">mức hài lòng</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.22 }}
          className="flex flex-col justify-center"
        >
          <p className="mb-4 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Vì sao chọn MSS301 Petclinic?
          </p>
          <h2 className="max-w-2xl text-4xl leading-tight font-black tracking-tight text-slate-950 md:text-5xl">
            Chăm sóc có cơ sở, không chỉ bằng cảm tính
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Mỗi lần thăm khám là một cuộc trao đổi minh bạch giữa bác sĩ và gia đình, với
            dữ liệu sức khỏe được theo dõi xuyên suốt.
          </p>

          <div className="mt-10 border-y border-slate-300/80">
            {reasons.map((reason, index) => (
              <div
                key={reason.title}
                className="grid gap-3 border-b border-slate-300/80 py-6 last:border-b-0 sm:grid-cols-[52px_1fr]"
              >
                <span className="font-black text-violet-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-xl font-black text-slate-950">{reason.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{reason.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2 text-sm font-bold text-slate-700">
            {['Đặt lịch online', 'Nhắc lịch tự động', 'Theo dõi sau khám'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-300 bg-white px-4 py-2"
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Services ─────────────────────────── */

function Services() {
  const serviceGroups = [
    {
      title: 'Khám & phòng bệnh',
      desc: 'Chủ động theo dõi sức khỏe và xây nền tảng phòng bệnh phù hợp theo độ tuổi.',
      services: ['Khám tổng quát', 'Tiêm phòng', 'Nha khoa'],
      image: '/images/landing/service-wellness-v2.jpg',
      imageAlt: 'Bác sĩ khám sức khỏe tổng quát cho chó',
    },
    {
      title: 'Chẩn đoán & điều trị',
      desc: 'Kết quả hình ảnh và xét nghiệm hỗ trợ bác sĩ đưa ra hướng điều trị có cơ sở.',
      services: ['Siêu âm / X-Quang', 'Phẫu thuật'],
      image: '/images/landing/service-diagnostics-v2.jpg',
      imageAlt: 'Bác sĩ thực hiện siêu âm cho chó',
    },
    {
      title: 'Grooming & chăm sóc',
      desc: 'Quy trình tắm, sấy và cắt tỉa nhẹ nhàng, phù hợp với da lông của từng bé.',
      services: ['Grooming & Spa', 'Chăm sóc da lông'],
      image: '/images/landing/service-grooming-v2.jpg',
      imageAlt: 'Nhân viên grooming chăm sóc lông cho chó',
    },
    {
      title: 'Tiện ích tại clinic',
      desc: 'Dinh dưỡng, phụ kiện và không gian lưu trú được tư vấn ngay tại một địa điểm.',
      services: ['Pet Shop', 'Lưu trú'],
      image: '/images/landing/service-convenience-v2.jpg',
      imageAlt: 'Nhân viên tư vấn sản phẩm dinh dưỡng cho chủ thú cưng',
      storeLink: true,
    },
  ];

  return (
    <section id="services" className="bg-white px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.22 }}
            className="max-w-3xl"
          >
            <p className="mb-4 text-sm font-bold tracking-widest text-violet-600 uppercase">
              Chuyên môn & dịch vụ
            </p>
            <h2 className="text-4xl leading-tight font-black tracking-tight text-slate-950 md:text-5xl">
              Một hệ sinh thái chăm sóc liền mạch
            </h2>
          </motion.div>
          <p className="max-w-md text-base leading-relaxed text-slate-600 lg:text-right">
            Từ phòng bệnh, điều trị đến grooming và lưu trú — mỗi dịch vụ đều có quy trình
            riêng, nhân sự phụ trách và thông tin rõ ràng.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {serviceGroups.map((group, index) => (
            <motion.article
              key={group.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.22 }}
              transition={{ delay: index * 0.08 }}
              className="group overflow-hidden rounded-[32px] border border-slate-200 bg-[#FAFAFF] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-100/60"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <LandingImage
                  src={group.image}
                  alt={group.imageAlt}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  width={1365}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                <span className="absolute bottom-5 left-6 text-sm font-black tracking-widest text-white/80 uppercase">
                  0{index + 1}
                </span>
              </div>
              <div className="p-7 sm:p-8">
                <h3 className="text-2xl font-black text-slate-950">{group.title}</h3>
                <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
                  {group.desc}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {group.services.map((service) => (
                    <span
                      key={service}
                      className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700"
                    >
                      {service}
                    </span>
                  ))}
                </div>
                {group.storeLink && (
                  <Button
                    asChild
                    variant="link"
                    className="mt-5 h-auto p-0 font-bold text-violet-600"
                  >
                    <Link to="/store">
                      Xem catalog tại cửa hàng <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Process ─────────────────────────── */

function Process() {
  const steps = [
    { title: 'Chọn thú cưng', desc: 'Chọn hồ sơ bé cần được chăm sóc.' },
    { title: 'Chọn lịch phù hợp', desc: 'Chọn bác sĩ, ngày và khung giờ thuận tiện.' },
    { title: 'Nhận xác nhận', desc: 'Thông tin lịch hẹn được gửi qua SMS và email.' },
    { title: 'Đến khám', desc: 'Nhân viên tiếp nhận đã có sẵn thông tin của bé.' },
  ];

  return (
    <section id="process" className="bg-[#F7F7FC] px-6 py-28">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.16 }}
        className="mx-auto grid max-w-7xl overflow-hidden rounded-[44px] bg-slate-950 shadow-2xl shadow-slate-300/50 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <div className="relative min-h-[440px] lg:min-h-[620px]">
          <LandingImage
            src="/images/landing/process-reception-v2.jpg"
            alt="Nhân viên MSS301 Petclinic xác nhận lịch hẹn với khách hàng"
            className="absolute inset-0 h-full w-full object-cover"
            width={1365}
            height={1024}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
          <div className="absolute right-7 bottom-7 left-7 rounded-2xl border border-white/15 bg-slate-950/45 p-5 text-white backdrop-blur-md">
            <p className="text-sm font-bold tracking-widest text-teal-300 uppercase">
              Tiếp nhận chủ động
            </p>
            <p className="mt-2 text-xl font-black">
              Ít chờ đợi, nhiều thời gian cho bác sĩ
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 text-white sm:p-12 lg:p-16">
          <p className="text-sm font-bold tracking-widest text-violet-300 uppercase">
            Quy trình đặt lịch
          </p>
          <h2 className="mt-4 text-4xl leading-tight font-black tracking-tight md:text-5xl">
            Bốn bước, một lịch hẹn rõ ràng
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-slate-300">
            Thông tin được chuẩn bị trước giúp đội ngũ tiếp nhận đúng nhu cầu và dành thời
            gian khám cho những điều thực sự quan trọng.
          </p>

          <div className="mt-10 grid border-t border-white/15 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="border-b border-white/15 py-6 sm:odd:pr-7 sm:even:border-l sm:even:pl-7"
              >
                <span className="text-sm font-black text-teal-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-xl font-black">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
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
      img: '/images/landing/doctor-minh-v2.jpg',
    },
    {
      name: 'BS. Hương Trần',
      role: 'Nội khoa',
      exp: '6 năm kinh nghiệm',
      rating: '4.8',
      img: '/images/landing/doctor-lan-v2.jpg',
    },
    {
      name: 'BS. Quân Lê',
      role: 'Chẩn đoán hình ảnh',
      exp: '5 năm kinh nghiệm',
      rating: '4.9',
      img: '/images/landing/doctor-khoa-v2.jpg',
    },
    {
      name: 'BS. Mai Phạm',
      role: 'Da liễu thú cưng',
      exp: '8 năm kinh nghiệm',
      rating: '4.8',
      img: '/images/landing/doctor-thao-v2.jpg',
    },
  ];

  return (
    <section id="team" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-end justify-between gap-6 md:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.22 }}
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
              viewport={{ once: false, amount: 0.22 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group overflow-hidden rounded-[32px] border border-slate-100 bg-[#FAFAFF] transition-all duration-300 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50"
            >
              <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                <LandingImage
                  src={t.img}
                  alt={t.name}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  width={1024}
                  height={1536}
                  loading="lazy"
                  decoding="async"
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

function CareJourney() {
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
          viewport={{ once: false, amount: 0.22 }}
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
          viewport={{ once: false, amount: 0.22 }}
          className="relative lg:w-1/2"
        >
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-[40px] border border-white/15 bg-white/10 p-2 shadow-2xl">
            <LandingImage
              src="/images/landing/care-journey-v2.jpg"
              className="aspect-[4/5] w-full rounded-[32px] object-cover"
              alt="Bác sĩ MSS301 Petclinic đồng hành cùng chó và mèo"
              width={1024}
              height={1536}
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-x-2 bottom-2 rounded-b-[32px] bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent px-7 pt-24 pb-7">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-bold tracking-widest text-teal-300 uppercase">
                    Cam kết chăm sóc
                  </p>
                  <p className="mt-1 text-xl font-black text-white">
                    Một bác sĩ, một hành trình rõ ràng
                  </p>
                </div>
                <div className="grid size-16 shrink-0 place-items-center rounded-full border border-white/30 bg-white/15 text-lg font-black backdrop-blur-md">
                  100%
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Facilities ─────────────────────────── */

function Facilities() {
  const facilities = [
    {
      title: 'Phòng phẫu thuật vô trùng',
      desc: 'Quy trình vô khuẩn, theo dõi gây mê và hồi sức sát sao.',
      stat: 'ISO care',
      icon: ShieldCheck,
      img: '/images/landing/facility-surgery-v2.jpg',
      className: 'md:col-span-2',
    },
    {
      title: 'Lab xét nghiệm',
      desc: 'Trả kết quả nhanh cho các chỉ số máu, sinh hóa và ký sinh.',
      stat: '30 phút',
      icon: Activity,
      img: '/images/landing/facility-lab-v2.jpg',
      className: '',
    },
    {
      title: 'Grooming & Spa',
      desc: 'Tắm, sấy, cắt tỉa và chăm da lông theo từng giống pet.',
      stat: 'Gentle',
      icon: Scissors,
      img: '/images/landing/facility-grooming-v2.jpg',
      className: '',
    },
    {
      title: 'Khu lưu trú tiện nghi',
      desc: 'Không gian nghỉ riêng, camera theo dõi và lịch chăm sóc rõ ràng.',
      stat: '24/7',
      icon: PawPrint,
      img: '/images/landing/facility-boarding-v2.jpg',
      className: 'md:col-span-2',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#FAFAFF] py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-violet-50/50 via-white/70 to-transparent" />
      <div className="pointer-events-none absolute right-[10%] bottom-10 h-56 w-56 rounded-full bg-teal-100/40 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative z-10 mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-bold tracking-widest text-violet-600 uppercase">
            Cơ sở vật chất
          </p>
          <h2 className="text-3xl leading-tight font-black text-slate-900 md:text-4xl">
            Môi trường an toàn, hiện đại
          </h2>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {facilities.map((facility, i) => (
            <motion.article
              key={facility.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.22 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'group relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-2 shadow-sm shadow-slate-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-100/70',
                facility.className,
              )}
            >
              <LandingImage
                src={facility.img}
                className="h-56 w-full rounded-[22px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                alt={facility.title}
                width={1365}
                height={1024}
                loading="lazy"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-x-2 top-2 h-56 rounded-[22px] bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
              <div className="absolute inset-x-5 top-5 flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-2xl bg-white/90 text-violet-600 shadow-lg shadow-slate-900/10 backdrop-blur-md">
                  <facility.icon className="size-5" />
                </div>
                <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1 text-xs font-black tracking-wider text-violet-700 uppercase shadow-sm backdrop-blur-md">
                  {facility.stat}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-black text-slate-950">{facility.title}</h3>
                <p className="mt-2 text-sm leading-relaxed font-medium text-slate-600">
                  {facility.desc}
                </p>
              </div>
            </motion.article>
          ))}
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
          viewport={{ once: false, amount: 0.22 }}
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
              viewport={{ once: false, amount: 0.22 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'relative flex flex-col rounded-[40px] p-8 transition-all duration-300',
                p.popular
                  ? 'z-10 bg-violet-600 py-12 text-white shadow-2xl shadow-violet-600/30 hover:bg-violet-700 hover:shadow-violet-600/45 md:scale-105'
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
      body: 'Phòng khám sạch sẽ, bác sĩ siêu nhẹ nhàng. Bé Miu nhà mình không hề sợ hãi khi đi tiêm.',
      author: 'Thu Hà & Miu Miu',
      initials: 'MM',
      accent: 'bg-violet-100 text-violet-700',
    },
    {
      body: 'Dịch vụ grooming chỉn chu, bé Oreo được cắt tỉa rất đáng yêu. Gia đình sẽ tiếp tục tin tưởng MSS301 Petclinic!',
      author: 'Minh Đức & Oreo',
      initials: 'OR',
      accent: 'bg-teal-100 text-teal-700',
    },
    {
      body: 'Bé cún bị ốm lúc nửa đêm, may có phòng khám cấp cứu kịp thời. Cảm ơn các bác sĩ rất nhiều.',
      author: 'Quỳnh Anh & Đốm',
      initials: 'ĐM',
      accent: 'bg-amber-100 text-amber-700',
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
              key={t.author}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.22 }}
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
                <div
                  className={cn(
                    'relative grid size-14 shrink-0 place-items-center rounded-full border-2 border-white text-sm font-black shadow-sm',
                    t.accent,
                  )}
                >
                  {t.initials}
                  <PawPrint className="absolute -right-1 -bottom-1 size-5 rounded-full bg-white p-1 text-violet-500 shadow-sm" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t.author}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Khách hàng đã xác minh
                  </p>
                </div>
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
        viewport={{ once: false, amount: 0.22 }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[48px] bg-gradient-to-br from-violet-600 via-violet-600 to-teal-500 p-10 shadow-2xl shadow-violet-600/20 lg:p-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_24%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.08)_35%,rgba(255,255,255,0.08)_36%,transparent_36%)]" />
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
            <span className="text-2xl font-black tracking-tight">MSS301 Petclinic</span>
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
              <span className="block size-4 text-center text-xs leading-4 font-bold">
                f
              </span>
            </a>
            <a
              href="#"
              className="rounded-xl bg-white/5 p-2.5 transition-all hover:bg-violet-600 hover:text-white"
            >
              <span className="block size-4 text-center text-xs leading-4 font-bold">
                ig
              </span>
            </a>
            <a
              href="#"
              className="rounded-xl bg-white/5 p-2.5 transition-all hover:bg-violet-600 hover:text-white"
            >
              <span className="block size-4 text-center text-xs leading-4 font-bold">
                yt
              </span>
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
              <Mail className="size-5 shrink-0 text-violet-400" /> hi@mss301.vn
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-sm font-medium text-slate-500 md:flex-row">
        <p>© 2026 MSS301 Petclinic. All rights reserved.</p>
        <p>
          Made with <Heart className="inline size-4 fill-rose-500 text-rose-500" /> for
          pets.
        </p>
      </div>
    </footer>
  );
}
