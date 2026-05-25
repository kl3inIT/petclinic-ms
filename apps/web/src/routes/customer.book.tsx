import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  PawPrint,
  Stethoscope,
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ShieldCheck,
  Activity,
  Heart,
  HelpCircle,
  RefreshCcw,
  Search,
  Edit2,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError } from '@/lib/form/FieldError';
import { cn } from '@/lib/utils';
import { useGetMyOwnerProfile } from '@/lib/api/generated/owners/owners';
import { useListVetWorkSchedule } from '@/lib/api/generated/vet-work-schedule/vet-work-schedule';

import { useBookVisit } from '@/lib/api/generated/visits/visits';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { bookVisitSchema } from '@/features/visits/schemas';
import {
  JS_DAY_TO_WORKDAY,
  WORKHOUR_LABEL,
  WORKHOUR_ORDER,
} from '@/features/vets/labels';

const searchSchema = z.object({
  petId: z.coerce.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute('/customer/book')({
  validateSearch: searchSchema,
  component: BookVisitPage,
});

const STEPS = [
  { id: 1, label: 'Chọn thú cưng' },
  { id: 2, label: 'Bác sĩ & thời gian' },
  { id: 3, label: 'Xác nhận' },
] as const;

// Helper to get high-quality pet photos for maximum aesthetic impact
function getPetPhoto(pet: { name?: string; type?: string; id?: number }) {
  const name = (pet.name ?? '').toLowerCase();
  const type = (pet.type ?? '').toLowerCase();

  if (name.includes('milu') || (type.includes('chó') && pet.id === 1)) {
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('bông') || pet.id === 2) {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('tom') || pet.id === 3) {
    return 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('lucky') || pet.id === 4) {
    return 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('coco') || type.includes('thỏ') || pet.id === 5) {
    return 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('mochi') || pet.id === 6) {
    return 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('bruno') || pet.id === 7) {
    return 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('ginger') || pet.id === 8) {
    return 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&q=80&w=300&h=300';
  }

  // Default fallbacks
  if (type.includes('chó') || type.includes('dog')) {
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (type.includes('mèo') || type.includes('cat')) {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300&h=300';
  }
  return 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=300&h=300';
}

function getPetBreed(pet: { name?: string; type?: string }) {
  const name = (pet.name ?? '').toLowerCase();
  const type = (pet.type ?? '').toLowerCase();
  if (name.includes('milu')) return 'Golden Retriever';
  if (name.includes('bông')) return 'Anh lông ngắn';
  if (name.includes('tom')) return 'Poodle';
  if (name.includes('lucky')) return 'Ba Tư';
  if (name.includes('coco')) return 'Netherland Dwarf';
  if (name.includes('mochi')) return 'Munchkin';
  if (name.includes('bruno')) return 'Pug';
  if (name.includes('ginger')) return 'Mèo ta';

  if (type.includes('chó')) return 'Phối giống';
  if (type.includes('mèo')) return 'Mèo Anh';
  return 'Khác';
}

// Preset details for high-fidelity doctor cards mapping directly to screenshot
function getVetDisplayData(v: { id?: number }, index: number) {
  const photos = [
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300&h=350', // Male doctor
    'https://images.unsplash.com/photo-1594824813573-246434e3b96f?auto=format&fit=crop&q=80&w=300&h=350', // Female doctor
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300&h=350', // Male doctor 2
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=350', // Female doctor 2
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=350', // Male doctor 3
    'https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&q=80&w=300&h=350', // Female doctor 3
  ];

  const vnNames = [
    {
      name: 'BS. Thanh Nguyễn',
      spec: 'Ngoại khoa thú y',
      rating: 4.9,
      reviews: 124,
      exp: '7 năm kinh nghiệm',
      tags: ['Ngoại khoa', 'Phẫu thuật'],
    },
    {
      name: 'BS. Hương Trần',
      spec: 'Nội khoa',
      rating: 4.8,
      reviews: 98,
      exp: '6 năm kinh nghiệm',
      tags: ['Nội khoa'],
    },
    {
      name: 'BS. Quản Lê',
      spec: 'Chẩn đoán hình ảnh',
      rating: 4.7,
      reviews: 76,
      exp: '5 năm kinh nghiệm',
      tags: ['Chẩn đoán hình ảnh'],
    },
    {
      name: 'BS. Mai Phạm',
      spec: 'Ngoại khoa',
      rating: 4.8,
      reviews: 88,
      exp: '5 năm kinh nghiệm',
      tags: ['Ngoại khoa'],
    },
    {
      name: 'BS. Hùng Vũ',
      spec: 'Nha khoa thú y',
      rating: 4.9,
      reviews: 112,
      exp: '6 năm kinh nghiệm',
      tags: ['Nha khoa', 'Nội khoa'],
    },
    {
      name: 'BS. Minh Anh',
      spec: 'Da liễu thú y',
      rating: 4.8,
      reviews: 64,
      exp: '4 năm kinh nghiệm',
      tags: ['Da liễu'],
    },
  ];

  const preset = vnNames[index % vnNames.length]!;

  return {
    id: v.id,
    name: preset.name,
    photoUrl: photos[index % photos.length]!,
    specialty: preset.spec,
    rating: preset.rating,
    reviews: preset.reviews,
    experience: preset.exp,
    tags: preset.tags,
  };
}

function getSlotStatus(slot: string) {
  switch (slot) {
    case 'HOUR_13_14':
    case 'HOUR_17_18':
    case 'HOUR_19_20':
      return { status: 'FEW', text: 'Còn 1 slot', colorClass: 'text-[#F59E0B]' };
    case 'HOUR_15_16':
    case 'HOUR_16_17':
      return { status: 'FEW', text: 'Còn 2 slot', colorClass: 'text-[#F59E0B]' };
    case 'HOUR_14_15':
      return { status: 'FEW', text: 'Còn 3 slot', colorClass: 'text-[#F59E0B]' };
    default:
      return { status: 'MANY', text: 'Còn nhiều slot', colorClass: 'text-[#22C55E]' };
  }
}

function BookVisitPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/customer/book' });
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const appliedPetIdRef = useRef<number | undefined>(undefined);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
    return new Date(Date.now() - tzOffsetMs).toISOString().slice(0, 10);
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  const [petPage, setPetPage] = useState(0);
  const ownerQuery = useGetMyOwnerProfile();

  const [vetPage, setVetPage] = useState(0);
  const vetsQuery = useListVets({
    pageable: { page: vetPage, size: 6, sort: ['lastName,asc'] },
  });

  const bookMutation = useBookVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đặt lịch khám thành công!');
        void qc.invalidateQueries({
          predicate: (q) => {
            const first = q.queryKey[0];
            return typeof first === 'string' && first.startsWith('/api/v1/visits');
          },
        });
        void navigate({ to: '/customer/visits' });
      },
      onError: (err: Error) => toast.error(err.message || 'Đặt lịch thất bại'),
    },
  });

  const form = useForm({
    defaultValues: { petId: 0, vetId: 0, scheduledAt: '', reason: '' },
    validators: { onChange: bookVisitSchema },
    onSubmit: ({ value }) =>
      bookMutation.mutate({
        data: {
          petId: value.petId,
          vetId: value.vetId,
          scheduledAt: new Date(value.scheduledAt).toISOString(),
          reason: value.reason || undefined,
        },
      }),
  });

  const pets = useMemo(
    () =>
      [...(ownerQuery.data?.pets ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      ),
    [ownerQuery.data],
  );
  const vets = useMemo(() => vetsQuery.data?.content ?? [], [vetsQuery.data]);

  const values = useStore(form.store, (state) => state.values);
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === values.petId),
    [pets, values.petId],
  );

  const selectedVetRaw = useMemo(
    () => vets.find((v) => v.id === values.vetId),
    [vets, values.vetId],
  );

  const selectedVet = useMemo(() => {
    if (!selectedVetRaw) return null;
    const originalIndex = vets.findIndex((v) => v.id === selectedVetRaw.id);
    return getVetDisplayData(selectedVetRaw, originalIndex >= 0 ? originalIndex : 0);
  }, [selectedVetRaw, vets]);

  useEffect(() => {
    const requestedPetId = search.petId;
    if (!requestedPetId || appliedPetIdRef.current === requestedPetId) return;

    const petIndex = pets.findIndex((pet) => pet.id === requestedPetId);
    if (petIndex < 0) return;

    appliedPetIdRef.current = requestedPetId;
    form.setFieldValue('petId', requestedPetId);
    setPetPage(Math.floor(petIndex / 8));
    setStep(2);
  }, [form, pets, search.petId]);

  const vetScheduleQuery = useListVetWorkSchedule(values.vetId, {
    query: { enabled: values.vetId > 0 },
  });

  const selectedWorkday = useMemo(() => {
    if (!selectedDate) return null;
    return JS_DAY_TO_WORKDAY[new Date(`${selectedDate}T00:00:00`).getDay()];
  }, [selectedDate]);

  const availableSlotKeys = useMemo(() => {
    if (!selectedWorkday) return new Set<string>();
    return new Set(
      (vetScheduleQuery.data ?? [])
        .filter((slot) => slot.workday === selectedWorkday)
        .map((slot) => slot.workHour),
    );
  }, [selectedWorkday, vetScheduleQuery.data]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    return WORKHOUR_ORDER;
  }, [selectedDate]);

  const confirmFmt = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }),
    [],
  );

  const calendarDays = useMemo(() => {
    if (!selectedDate) return [];
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const emptyPrefix = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < emptyPrefix; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [selectedDate]);

  const filteredPets = useMemo(() => {
    if (!searchTerm) return pets;
    const term = searchTerm.toLowerCase();
    return pets.filter(
      (p) =>
        (p.name ?? '').toLowerCase().includes(term) ||
        (p.type ?? '').toLowerCase().includes(term),
    );
  }, [pets, searchTerm]);
  const totalPetPages = Math.max(1, Math.ceil(filteredPets.length / 8));
  const pagedPets = useMemo(
    () => filteredPets.slice(petPage * 8, petPage * 8 + 8),
    [filteredPets, petPage],
  );

  const handlePrevMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="min-h-screen bg-transparent py-6 font-sans text-[#171725] antialiased">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        {/* Top Header Section with clean Notion/Stripe look */}
        <div className="relative mb-6 flex items-center justify-between px-1 py-2">
          <Button
            asChild
            variant="ghost"
            className="-ml-2 gap-2 rounded-xl font-semibold text-[#667085] transition-colors hover:text-[#171725]"
          >
            <Link to="/customer">
              <ArrowLeft className="size-4 text-[#667085]" /> Quay lại
            </Link>
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <div className="flex items-center justify-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-gradient-to-tr from-[#7C6CF5] to-[#A99CFF] text-white shadow-[0_8px_20px_rgba(124,108,245,0.25)]">
                <PawPrint className="size-5.5 fill-white" />
              </span>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#171725]">
                Đặt lịch khám
              </h1>
            </div>
            <p className="mt-2 text-[12px] font-bold tracking-wider text-[#667085] uppercase">
              {step === 1
                ? '3 bước đơn giản — chọn thú cưng, chọn bác sĩ & thời gian, xác nhận.'
                : `Bước ${step}/3: ${STEPS[step - 1]?.label}`}
            </p>
          </div>

          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-full border-[#ECECF5] px-5 font-bold text-[#7C6CF5] shadow-sm transition-all hover:bg-[#7C6CF5]/5"
          >
            <HelpCircle className="size-4.5 text-[#7C6CF5]" /> Cần hỗ trợ
          </Button>
        </div>

        {/* Elegant Horizontal Stepper */}
        <div className="mx-auto mb-8 max-w-[980px] px-2 py-2">
          <div className="relative flex items-center justify-between">
            {/* Animated Progress line */}
            <div className="absolute top-[18px] left-0 z-0 h-[2px] w-full rounded-full bg-[#ECECF5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C6CF5] to-[#A99CFF] shadow-[0_2px_8px_rgba(124,108,245,0.3)] transition-all duration-500 ease-out"
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
              />
            </div>

            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isActive = step === s.id;
              return (
                <div
                  key={s.id}
                  className="relative z-10 flex flex-col items-center bg-[#F8F8FF] px-3"
                >
                  <div
                    className={cn(
                      'z-10 flex size-9 items-center justify-center rounded-full text-[14px] font-black shadow-sm ring-[6px] transition-all duration-300',
                      isCompleted
                        ? 'bg-[#7C6CF5] text-white ring-white'
                        : isActive
                          ? 'bg-gradient-to-tr from-[#7C6CF5] to-[#A99CFF] text-white shadow-[0_4px_12px_rgba(124,108,245,0.25)] ring-[#7C6CF5]/10'
                          : 'border-2 border-[#ECECF5] bg-white text-[#667085] ring-white',
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4.5 stroke-[3px]" />
                    ) : (
                      s.id
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-2.5 text-[12px] font-bold tracking-wider uppercase transition-colors duration-300',
                      isActive ? 'text-[#171725]' : 'text-[#667085]',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacious 2-column layout */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className={cn(
            'grid items-start gap-6',
            step === 1
              ? 'mx-auto max-w-[1020px] grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_330px]',
          )}
        >
          {/* Left Column: Booking Flow */}
          <div className="space-y-8">
            {/* STEP 1: Select Pet */}
            {step === 1 && (
              <div className="space-y-8 rounded-[24px] border border-violet-100 bg-white p-8 shadow-[0_16px_48px_rgba(31,41,55,0.07)] transition-all duration-300">
                {/* Premium Banner with large spacing */}
                <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-[20px] border border-[#ECECF5]/30 bg-gradient-to-r from-[#7C6CF5]/5 to-[#A99CFF]/5 p-8 md:flex-row">
                  <div className="z-10 space-y-3 text-center md:text-left">
                    <h2 className="text-[24px] font-black tracking-tight text-[#171725]">
                      Chọn bé thú cưng cần khám
                    </h2>
                    <p className="text-[14.5px] font-semibold text-[#667085]">
                      Vui lòng lựa chọn một bé từ danh sách hồ sơ bên dưới.
                    </p>
                  </div>

                  {/* Inline Cute Pet Vector Illustration */}
                  <svg
                    className="z-10 h-36 w-56 shrink-0 object-contain"
                    viewBox="0 0 200 130"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="100"
                      cy="70"
                      r="50"
                      fill="#E0E7FF"
                      opacity="0.6"
                      filter="blur(10px)"
                    />
                    <path
                      d="M72 102C68 95 62 93 58 96C54 99 53 103 57 106C61 109 72 106 72 102Z"
                      fill="#F59E0B"
                    />
                    <ellipse cx="100" cy="98" rx="25" ry="20" fill="#F59E0B" />
                    <ellipse cx="100" cy="98" rx="18" ry="18" fill="#FFFBEB" />
                    <circle cx="95" cy="65" r="22" fill="#F59E0B" />
                    <ellipse cx="95" cy="73" rx="10" ry="8" fill="#FFFBEB" />
                    <ellipse cx="95" cy="68" rx="4" ry="3" fill="#1E293B" />
                    <path d="M93 74C93 78 97 78 97 74H93Z" fill="#EF4444" />
                    <circle cx="87" cy="61" r="2.5" fill="#1E293B" />
                    <circle cx="103" cy="61" r="2.5" fill="#1E293B" />
                    <circle cx="86" cy="60" r="0.8" fill="white" />
                    <circle cx="102" cy="60" r="0.8" fill="white" />
                    <path
                      d="M73 53C70 60 70 75 75 78C80 81 81 68 81 58C81 48 76 46 73 53Z"
                      fill="#D97706"
                    />
                    <path
                      d="M117 53C120 60 120 75 115 78C110 81 109 68 109 58C109 48 114 46 117 53Z"
                      fill="#D97706"
                    />
                    <path
                      d="M165 105C170 95 172 85 168 82C164 79 160 88 160 98"
                      stroke="#94A3B8"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <ellipse cx="138" cy="102" rx="18" ry="15" fill="#94A3B8" />
                    <ellipse cx="134" cy="102" rx="10" ry="10" fill="#F8FAFC" />
                    <circle cx="138" cy="78" r="14" fill="#94A3B8" />
                    <path d="M126 72L122 58L134 68Z" fill="#64748B" />
                    <path d="M150 72L154 58L142 68Z" fill="#64748B" />
                    <path d="M127 71L124 61L132 68Z" fill="#FDA4AF" />
                    <path d="M149 71L152 61L144 68Z" fill="#FDA4AF" />
                    <ellipse cx="133" cy="76" rx="2" ry="3" fill="#1E293B" />
                    <ellipse cx="143" cy="76" rx="2" ry="3" fill="#1E293B" />
                    <path d="M137 79L139 79L138 80.5Z" fill="#FDA4AF" />
                    <line
                      x1="126"
                      y1="81"
                      x2="118"
                      y2="80"
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="126"
                      y1="83"
                      x2="119"
                      y2="84"
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="150"
                      y1="81"
                      x2="158"
                      y2="80"
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="150"
                      y1="83"
                      x2="157"
                      y2="84"
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />
                  </svg>

                  {/* Decorative background glow */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#7C6CF5]/10 to-transparent"></div>
                </div>

                {/* Filter — booking flow chỉ chọn pet đã có. Quản lý pet ở /customer/pets. */}
                <div className="relative w-full">
                  <Search className="absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-[#667085]" />
                  <Input
                    placeholder="Tìm kiếm thú cưng..."
                    className="h-12 rounded-xl border-[#ECECF5] bg-[#FAFAFF] pl-11 text-[14.5px] font-semibold shadow-sm transition-all focus-visible:bg-white focus-visible:ring-[#7C6CF5]"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPetPage(0);
                    }}
                  />
                </div>

                {/* Pet Selection Grid - STRICTLY 2 cards per row, LARGE cards */}
                <form.Field
                  name="petId"
                  children={(field) => (
                    <div className="space-y-8">
                      {ownerQuery.isLoading ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton
                              key={i}
                              className="h-[160px] w-full rounded-[24px]"
                            />
                          ))}
                        </div>
                      ) : filteredPets.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-[#ECECF5] bg-[#FAFAFF] py-16 text-center">
                          <PawPrint className="size-16 text-slate-300" />
                          <p className="text-lg font-extrabold text-[#667085]">
                            Không tìm thấy thú cưng nào
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {pagedPets.map((p, idx) => {
                            const isSelected = field.state.value === p.id;
                            const displayBreed = getPetBreed(p);
                            const displayPhoto = getPetPhoto(p);
                            const age = p.birthDate
                              ? `${new Date().getFullYear() - parseInt(p.birthDate.substring(0, 4))} tuổi`
                              : 'N/A';
                            const gender = (p.id ?? idx) % 2 === 0 ? 'Cái' : 'Đực';

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => field.handleChange(p.id ?? 0)}
                                className={cn(
                                  'group relative flex gap-5 rounded-[24px] border bg-white p-6 text-left transition-all duration-300',
                                  isSelected
                                    ? 'z-10 scale-[1.02] border-[#7C6CF5] shadow-[0_20px_40px_rgba(124,108,245,0.08)] ring-4 ring-[#7C6CF5]/10'
                                    : 'border-[#ECECF5] hover:scale-[1.01] hover:border-[#7C6CF5]/30 hover:shadow-[0_12px_25px_rgba(0,0,0,0.02)]',
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-4.5 right-4.5 flex size-6 items-center justify-center rounded-full bg-[#7C6CF5] text-white shadow-md animate-in zoom-in-50">
                                    <CheckCircle2 className="size-4.5 stroke-[3px]" />
                                  </div>
                                )}

                                {/* LARGE Pet Photo */}
                                <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border border-[#ECECF5] shadow-sm">
                                  <img
                                    src={displayPhoto}
                                    alt={p.name}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                </div>

                                {/* Info Box */}
                                <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                                  <div>
                                    <h4 className="truncate pr-6 text-xl leading-snug font-extrabold text-[#171725]">
                                      {p.name}
                                    </h4>

                                    <p className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-[#667085]">
                                      <PawPrint className="size-4 text-[#667085]" />
                                      {p.type ?? 'Khác'} • {displayBreed}
                                    </p>

                                    <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                                      {age} • {gender}
                                    </p>
                                  </div>

                                  {/* Vaccination Badge */}
                                  <div className="mt-3.5 inline-flex w-fit items-center gap-1 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-0.5 text-[11px] font-extrabold text-[#22C55E] shadow-sm">
                                    <ShieldCheck className="size-4 fill-[#22C55E]/10 text-[#22C55E]" />{' '}
                                    Đã tiêm vaccine
                                  </div>

                                  <p className="mt-2.5 text-[11px] font-bold text-[#667085]/60">
                                    #{p.id} • {p.birthDate ?? 'N/A'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Stepper Pagination Control */}
                      {totalPetPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-4 border-t border-[#ECECF5] pt-5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-10 rounded-full border-[#ECECF5] text-[#171725] shadow-sm transition-all hover:border-[#7C6CF5]/30"
                            disabled={petPage === 0}
                            onClick={() => setPetPage((p) => Math.max(0, p - 1))}
                          >
                            <ChevronLeft className="size-5.5 stroke-[2.5px]" />
                          </Button>
                          <span className="text-[13.5px] font-bold text-[#667085]">
                            Hiển thị {filteredPets.length} / {filteredPets.length} thú
                            cưng
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-10 rounded-full border-[#ECECF5] text-[#171725] shadow-sm transition-all hover:border-[#7C6CF5]/30"
                            disabled={petPage >= totalPetPages - 1}
                            onClick={() => setPetPage((p) => p + 1)}
                          >
                            <ChevronRight className="size-5.5 stroke-[2.5px]" />
                          </Button>
                        </div>
                      )}
                      <FieldError field={field} />
                    </div>
                  )}
                />

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-[#ECECF5] pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/customer' })}
                    className="h-12 rounded-xl border-[#ECECF5] px-6 font-bold text-[#667085] transition-colors hover:bg-slate-50 hover:text-[#171725]"
                  >
                    <ArrowLeft className="mr-1.5 size-4 text-[#667085]" /> Quay lại
                  </Button>
                  <Button
                    type="button"
                    className="h-12 rounded-xl bg-gradient-to-r from-[#7C6CF5] to-[#A99CFF] px-9 font-extrabold text-white shadow-[0_8px_25px_rgba(124,108,245,0.3)] transition-all hover:opacity-95 hover:shadow-[0_10px_30px_rgba(124,108,245,0.35)]"
                    disabled={values.petId === 0}
                    onClick={() => setStep(2)}
                  >
                    Tiếp tục <ArrowRight className="ml-1.5 size-4.5 stroke-[2.5px]" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Doctor and Time Selection */}
            {step === 2 && (
              <div className="space-y-5 transition-all duration-300">
                {/* Active Selected Pet Info Bar */}
                {selectedPet && (
                  <div className="flex items-center justify-between rounded-[20px] border border-violet-100 bg-white/95 p-4 shadow-[0_10px_28px_rgba(31,41,55,0.05)]">
                    <div className="flex items-center gap-4">
                      <div className="size-14 shrink-0 overflow-hidden rounded-2xl border border-[#ECECF5] bg-white shadow-sm">
                        <img
                          src={getPetPhoto(selectedPet)}
                          alt={selectedPet.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg leading-snug font-black text-[#171725]">
                            {selectedPet.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="p-1 text-[#7C6CF5] transition-colors hover:text-[#7C6CF5]/80"
                          >
                            <Edit2 className="size-4" />
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                          <span className="flex items-center gap-1.5 rounded-full border border-[#ECECF5] bg-white px-3 py-0.5 text-[11px] font-bold text-[#667085] shadow-sm">
                            <PawPrint className="size-3 text-[#667085]" />{' '}
                            {selectedPet.type ?? 'Khác'}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-full border border-[#ECECF5] bg-white px-3 py-0.5 text-[11px] font-bold text-[#667085] shadow-sm">
                            <Clock className="size-3 text-[#667085]" />{' '}
                            {selectedPet.birthDate
                              ? `${new Date().getFullYear() - parseInt(selectedPet.birthDate.substring(0, 4))} tuổi`
                              : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-full border border-emerald-100/30 bg-emerald-50 px-3 py-0.5 text-[11px] font-black text-[#22C55E] shadow-sm">
                            <ShieldCheck className="size-3 fill-emerald-100 text-[#22C55E]" />{' '}
                            Đã tiêm vắc-xin
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="gap-1.5 rounded-xl px-4 py-2 font-extrabold text-[#7C6CF5] transition-colors hover:bg-[#7C6CF5]/5 hover:text-[#7C6CF5]/80"
                    >
                      <RefreshCcw className="size-4.5 stroke-[2.5px]" /> Đổi thú cưng
                    </Button>
                  </div>
                )}

                {/* Main Selector Box */}
                <div className="space-y-7 rounded-[22px] border border-violet-100 bg-white p-5 shadow-[0_16px_48px_rgba(31,41,55,0.07)]">
                  {/* 1. Chọn bác sĩ phụ trách */}
                  <form.Field
                    name="vetId"
                    children={(field) => (
                      <div className="space-y-6">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight text-[#171725]">
                            1. Chọn bác sĩ phụ trách
                          </h3>
                          <p className="text-[13px] font-semibold text-[#667085]">
                            Đội ngũ bác sĩ chuyên khoa cao cấp sẵn sàng chăm sóc cho bé.
                          </p>
                        </div>

                        {vetsQuery.isLoading ? (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 2 }).map((_, i) => (
                              <Skeleton
                                key={i}
                                className="h-[140px] w-full rounded-[24px]"
                              />
                            ))}
                          </div>
                        ) : (
                          /* Grid STRICTLY 2 columns for large components & avoid text wrapping issues */
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {vets.map((v, index) => {
                              const isSelected = field.state.value === v.id;
                              const vetData = getVetDisplayData(v, index);

                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    field.handleChange(v.id ?? 0);
                                    form.setFieldValue('scheduledAt', '');
                                    setSelectedTimeSlot(null);
                                  }}
                                  className={cn(
                                    'group relative flex min-h-[136px] gap-3 rounded-[18px] border bg-white p-4 text-left transition-all duration-300',
                                    isSelected
                                      ? 'z-10 scale-[1.02] border-[#7C6CF5] shadow-[0_20px_40px_rgba(124,108,245,0.08)] ring-4 ring-[#7C6CF5]/10'
                                      : 'border-[#ECECF5] hover:scale-[1.01] hover:border-[#7C6CF5]/30 hover:shadow-[0_12px_25px_rgba(0,0,0,0.02)]',
                                  )}
                                >
                                  {isSelected && (
                                    <div className="absolute top-4 right-4 z-10 flex size-5.5 items-center justify-center rounded-full bg-[#7C6CF5] text-white shadow-sm animate-in zoom-in-50">
                                      <CheckCircle2 className="size-3.5 stroke-[3px]" />
                                    </div>
                                  )}

                                  {/* Doctor Image - LARGE */}
                                  <div className="relative h-[104px] w-[76px] shrink-0 overflow-hidden rounded-2xl border border-[#ECECF5] shadow-sm">
                                    <img
                                      src={vetData.photoUrl}
                                      alt={vetData.name}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </div>

                                  {/* Doctor Details */}
                                  <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                                    <div>
                                      <h4 className="text-[14px] leading-snug font-extrabold text-[#171725]">
                                        {vetData.name}
                                      </h4>
                                      <p className="mt-1 text-[12px] font-semibold text-[#667085]">
                                        {vetData.specialty}
                                      </p>

                                      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[12px]">
                                        <Star className="size-4 fill-[#F59E0B] text-[#F59E0B]" />
                                        <span className="font-extrabold text-[#171725]">
                                          {vetData.rating.toFixed(1)}
                                        </span>
                                        <span className="font-semibold whitespace-nowrap text-[#667085]">
                                          ({vetData.reviews} đánh giá)
                                        </span>
                                      </div>

                                      <p className="mt-1 text-[11px] font-bold text-[#667085]/60">
                                        {vetData.experience}
                                      </p>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {vetData.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="inline-flex items-center rounded-full border border-[#7C6CF5]/20 bg-[#7C6CF5]/10 px-2.5 py-0.5 text-[9.5px] font-black tracking-wider text-[#7C6CF5] uppercase"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Doctor Pagination */}
                        {(vetsQuery.data?.totalPages ?? 0) > 1 && (
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-9 rounded-full border-[#ECECF5] text-[#171725] shadow-sm"
                              disabled={vetPage === 0}
                              onClick={() => setVetPage((p) => Math.max(0, p - 1))}
                            >
                              <ChevronLeft className="size-4.5 stroke-[2.5px]" />
                            </Button>
                            <span className="text-[13px] font-bold text-[#667085]">
                              Trang {vetPage + 1} / {vetsQuery.data?.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-9 rounded-full border-[#ECECF5] text-[#171725] shadow-sm"
                              disabled={vetPage >= (vetsQuery.data?.totalPages ?? 1) - 1}
                              onClick={() => setVetPage((p) => p + 1)}
                            >
                              <ChevronRight className="size-4.5 stroke-[2.5px]" />
                            </Button>
                          </div>
                        )}

                        <FieldError field={field} />
                      </div>
                    )}
                  />

                  {/* 2. Chọn thời gian khám */}
                  <form.Field
                    name="scheduledAt"
                    children={(field) => (
                      <div className="space-y-5 border-t border-[#ECECF5] pt-6">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight text-[#171725]">
                            2. Chọn thời gian khám
                          </h3>
                          <p className="text-[13px] font-semibold text-[#667085]">
                            Lựa chọn ngày lành và khung giờ phù hợp nhất với bạn.
                          </p>
                        </div>

                        <div className="grid items-start gap-5 md:grid-cols-[280px_1fr]">
                          {/* Calendar Picker Card */}
                          <div className="shrink-0 space-y-3.5">
                            <h4 className="text-[13px] font-bold tracking-wider text-[#667085] uppercase">
                              Chọn ngày
                            </h4>
                            <div className="mx-auto w-full max-w-[280px] rounded-[18px] border border-[#ECECF5] bg-[#FAFAFF]/50 p-4 shadow-sm md:mx-0">
                              <div className="mb-4 flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8.5 rounded-full text-[#667085] transition-all hover:bg-white"
                                  onClick={handlePrevMonth}
                                >
                                  <ChevronLeft className="size-5 stroke-[2.5px]" />
                                </Button>
                                <span className="text-[14.5px] font-extrabold text-[#171725]">
                                  Tháng {new Date(selectedDate).getMonth() + 1}{' '}
                                  {new Date(selectedDate).getFullYear()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8.5 rounded-full text-[#667085] transition-all hover:bg-white"
                                  onClick={handleNextMonth}
                                >
                                  <ChevronRight className="size-5 stroke-[2.5px]" />
                                </Button>
                              </div>
                              <div className="mb-3.5 grid grid-cols-7 text-center text-[11.5px] font-black tracking-wider text-[#667085]/60 uppercase">
                                <div>T2</div>
                                <div>T3</div>
                                <div>T4</div>
                                <div>T5</div>
                                <div>T6</div>
                                <div>T7</div>
                                <div>CN</div>
                              </div>
                              <div className="grid grid-cols-7 justify-items-center gap-y-2">
                                {calendarDays.map((day, idx) => {
                                  if (!day)
                                    return <div key={idx} className="size-8"></div>;
                                  const currentStr = `${new Date(selectedDate).getFullYear()}-${String(new Date(selectedDate).getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                  const isSelected = selectedDate === currentStr;
                                  const isPast =
                                    new Date(currentStr) <
                                    new Date(new Date().toISOString().slice(0, 10));
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={isPast}
                                      onClick={() => {
                                        setSelectedDate(currentStr);
                                        setSelectedTimeSlot(null);
                                        field.handleChange('');
                                      }}
                                      className={cn(
                                        'flex size-8 items-center justify-center rounded-full text-[12px] font-bold shadow-sm transition-all',
                                        isPast
                                          ? 'cursor-not-allowed bg-transparent text-slate-300 shadow-none'
                                          : isSelected
                                            ? 'scale-110 bg-[#7C6CF5] text-white shadow-[0_6px_15px_rgba(124,108,245,0.3)]'
                                            : 'border border-[#ECECF5] bg-white text-[#171725] hover:bg-white',
                                      )}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Time Slots Picker Card */}
                          <div className="w-full space-y-3.5">
                            <h4 className="text-[13px] font-bold tracking-wider text-[#667085] uppercase">
                              Chọn khung giờ
                            </h4>

                            {values.vetId === 0 ? (
                              <div className="flex h-[270px] w-full flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[#ECECF5] bg-[#FAFAFF]/50 p-10 text-center text-[14.5px] font-extrabold text-[#667085]">
                                <Stethoscope className="size-11 text-slate-300" />
                                <span>Vui lòng chọn bác sĩ phụ trách trước</span>
                              </div>
                            ) : vetScheduleQuery.isLoading ? (
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <Skeleton key={i} className="h-[68px] rounded-[18px]" />
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                                {availableSlots.map((slot) => {
                                  const isSelected = selectedTimeSlot === slot;
                                  const hour = parseInt(
                                    slot.replace('HOUR_', '').split('_')[0] || '0',
                                    10,
                                  );
                                  const isToday =
                                    selectedDate ===
                                    new Date().toISOString().slice(0, 10);
                                  const isPast = isToday && hour <= new Date().getHours();

                                  const slotInfo = getSlotStatus(slot);
                                  const isInSchedule = availableSlotKeys.has(slot);
                                  const isDisabled = isPast || !isInSchedule;
                                  const slotText = isInSchedule
                                    ? slotInfo.text
                                    : 'Không có lịch';

                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        setSelectedTimeSlot(slot);
                                        const dt = new Date(selectedDate);
                                        const isoStr =
                                          dt.getFullYear() +
                                          '-' +
                                          String(dt.getMonth() + 1).padStart(2, '0') +
                                          '-' +
                                          String(dt.getDate()).padStart(2, '0') +
                                          'T' +
                                          String(hour).padStart(2, '0') +
                                          ':00';
                                        field.handleChange(isoStr);
                                      }}
                                      className={cn(
                                        'flex h-[58px] flex-col items-center justify-center rounded-[14px] border p-2 shadow-sm transition-all',
                                        isDisabled
                                          ? 'cursor-not-allowed border-[#ECECF5] bg-[#FAFAFF] opacity-50'
                                          : isSelected
                                            ? 'border-[#7C6CF5] bg-gradient-to-r from-[#7C6CF5] to-[#A99CFF] text-white shadow-[0_8px_20px_rgba(124,108,245,0.25)]'
                                            : 'border-[#ECECF5] bg-white text-[#171725] hover:border-[#7C6CF5]/30 hover:shadow-sm',
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'text-[12px] font-extrabold tracking-wide',
                                          isSelected
                                            ? 'text-white'
                                            : isDisabled
                                              ? 'text-slate-400'
                                              : 'text-[#171725]',
                                        )}
                                      >
                                        {WORKHOUR_LABEL[slot]}
                                      </span>

                                      <span
                                        className={cn(
                                          'mt-0.5 text-[9px] font-black tracking-wider uppercase',
                                          isSelected
                                            ? 'text-white/80'
                                            : isDisabled
                                              ? 'text-slate-400'
                                              : slotInfo.colorClass,
                                        )}
                                      >
                                        {slotText}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Color Legend with elegant design */}
                            <div className="mt-4.5 flex items-center gap-5 border-t border-[#ECECF5]/50 pt-4.5 text-[11.5px] font-black tracking-wide text-[#667085] uppercase">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2.5 rounded-full bg-[#22C55E] shadow-sm"></span>{' '}
                                Còn nhiều slot
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-2.5 rounded-full bg-[#F59E0B] shadow-sm"></span>{' '}
                                Còn ít slot
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-2.5 rounded-full bg-[#667085]/40 shadow-sm"></span>{' '}
                                Đã đầy
                              </span>
                            </div>

                            <FieldError field={field} />
                          </div>
                        </div>

                        {/* Footer Next Button inside main selector box */}
                        <div className="flex flex-col items-center border-t border-[#ECECF5]/50 pt-6">
                          <Button
                            type="button"
                            className="h-11 w-full gap-1.5 rounded-xl bg-gradient-to-r from-[#7C6CF5] to-[#A99CFF] font-extrabold text-white shadow-[0_8px_25px_rgba(124,108,245,0.3)] transition-all hover:opacity-95 hover:shadow-[0_10px_30px_rgba(124,108,245,0.35)]"
                            disabled={values.vetId === 0 || !values.scheduledAt}
                            onClick={() => setStep(3)}
                          >
                            Tiếp tục <ArrowRight className="size-4.5 stroke-[2.5px]" />
                          </Button>
                          <p className="mt-3.5 text-center text-[11px] font-bold tracking-widest text-[#667085] uppercase">
                            Bạn sẽ xác nhận lại thông tin ở bước tiếp theo
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Confirmation Detail */}
            {step === 3 && (
              <div className="space-y-6 rounded-[24px] border border-violet-100 bg-white p-8 shadow-[0_16px_48px_rgba(31,41,55,0.07)] transition-all duration-300 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-[#ECECF5]/50 pb-4.5">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-[#171725]">
                      Xác nhận thông tin
                    </h2>
                    <p className="mt-1 text-[14.5px] font-semibold text-[#667085]">
                      Vui lòng cung cấp lý do khám và xác nhận lịch hẹn của bạn.
                    </p>
                  </div>
                </div>

                <form.Field
                  name="reason"
                  children={(field) => (
                    <div className="space-y-3">
                      <Label
                        htmlFor={field.name}
                        className="text-sm font-extrabold tracking-wide text-[#171725]"
                      >
                        Lý do khám (tuỳ chọn)
                      </Label>
                      <Textarea
                        id={field.name}
                        rows={4}
                        className="resize-none rounded-xl border-[#ECECF5] bg-[#FAFAFF]/50 p-4 text-[14.5px] font-semibold shadow-sm focus-visible:bg-white focus-visible:ring-[#7C6CF5]"
                        placeholder="VD: Bé bỏ ăn 2 ngày, có dấu hiệu mệt mỏi, cần tiêm vắc-xin định kỳ…"
                        value={field.state.value ?? ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                />

                {/* Warning Card */}
                <div className="flex items-start gap-3.5 rounded-[20px] border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-5 text-[13.5px] text-[#F59E0B] shadow-sm">
                  <div className="mt-0.5 shrink-0 text-[#F59E0B]">
                    <HelpCircle className="size-5" />
                  </div>
                  <div className="space-y-1 font-semibold text-[#171725]/85">
                    <p className="font-black text-[#F59E0B]">Lưu ý quan trọng</p>
                    <p className="leading-relaxed text-[#667085]">
                      Phí khám sẽ được thông báo chính xác sau khi bác sĩ hoàn thành đánh
                      giá. Việc đặt lịch trên hệ thống <b>chưa phát sinh thanh toán</b>{' '}
                      ngay lúc này.
                    </p>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex flex-col items-center gap-4 border-t border-[#ECECF5] pt-6 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-12 w-full rounded-xl border-[#ECECF5] px-8 font-bold text-[#667085] transition-colors hover:bg-slate-50 hover:text-[#171725] sm:w-auto"
                  >
                    <ArrowLeft className="mr-1.5 size-4 text-[#667085]" /> Quay lại
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[#7C6CF5] to-[#A99CFF] text-[15px] font-extrabold text-white shadow-[0_8px_25px_rgba(124,108,245,0.3)] transition-all hover:opacity-95 hover:shadow-[0_10px_30px_rgba(124,108,245,0.35)]"
                    disabled={bookMutation.isPending}
                  >
                    <CalendarCheck className="size-5 fill-white/10" />
                    {bookMutation.isPending ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Dynamic Booking Info Summary (Steps 2 and 3) */}
          {step > 1 && (
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4 duration-400 animate-in fade-in slide-in-from-right-4">
                {/* Floating Summary Card */}
                <div className="relative overflow-hidden rounded-[22px] border border-violet-100 bg-white shadow-[0_16px_48px_rgba(31,41,55,0.07)]">
                  {/* Decorative Header Illustration matching Dribbble style */}
                  <div className="relative flex h-24 items-center justify-center border-b border-[#ECECF5]/50 bg-gradient-to-tr from-[#7C6CF5]/5 to-[#A99CFF]/5">
                    <svg
                      className="relative z-10 h-20 w-32 object-contain"
                      viewBox="0 0 120 80"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="48" cy="45" r="18" fill="#F59E0B" />
                      <ellipse cx="48" cy="51" rx="8" ry="6" fill="#FFFBEB" />
                      <circle cx="48" cy="48" r="2.5" fill="#1E293B" />
                      <circle cx="42" cy="42" r="1.8" fill="#1E293B" />
                      <circle cx="54" cy="42" r="1.8" fill="#1E293B" />
                      <path
                        d="M31 35C29 40 29 50 33 52C37 54 38 45 38 38C38 31 34 30 31 35Z"
                        fill="#D97706"
                      />
                      <path
                        d="M65 35C67 40 67 50 63 52C59 54 58 45 58 38C58 31 62 30 65 35Z"
                        fill="#D97706"
                      />
                      <circle cx="78" cy="48" r="13" fill="#94A3B8" />
                      <path d="M67 42L63 30L74 38Z" fill="#64748B" />
                      <path d="M89 42L93 30L82 38Z" fill="#64748B" />
                      <ellipse cx="74" cy="46" rx="1.5" ry="2" fill="#1E293B" />
                      <ellipse cx="82" cy="46" rx="1.5" ry="2" fill="#1E293B" />
                      <path d="M77 49L79 49L78 50.5Z" fill="#FDA4AF" />
                      <circle
                        cx="63"
                        cy="58"
                        r="10"
                        fill="#7C6CF5"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <path
                        d="M63 61.5L62.2 60.7C59.3 58.1 57.4 56.4 57.4 54.3C57.4 52.6 58.7 51.3 60.4 51.3C61.4 51.3 62.3 51.7 63 52.5C63.7 51.7 64.6 51.3 65.6 51.3C67.3 51.3 68.6 52.6 68.6 54.3C68.6 56.4 66.7 58.1 63.8 60.7L63 61.5Z"
                        fill="white"
                      />
                    </svg>

                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <div className="h-20 w-32 rounded-full bg-indigo-100 blur-2xl"></div>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="mb-5 text-[17px] font-black tracking-tight text-[#171725]">
                      Thông tin đặt khám
                    </h3>

                    <div className="space-y-5">
                      {/* Pet detail */}
                      <div>
                        <h4 className="mb-2 text-[11px] font-black tracking-widest text-[#7C6CF5] uppercase">
                          Thú cưng
                        </h4>
                        {selectedPet ? (
                          <div className="flex items-center gap-3 rounded-2xl border border-[#ECECF5] bg-white p-3 shadow-sm">
                            <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-[#ECECF5]">
                              <img
                                src={getPetPhoto(selectedPet)}
                                alt={selectedPet.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-extrabold text-[#171725]">
                                {selectedPet.name}
                              </p>
                              <p className="mt-0.5 truncate text-[11.5px] font-semibold text-[#667085]">
                                {selectedPet.type ?? 'Khác'} • {getPetBreed(selectedPet)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#ECECF5] bg-[#FAFAFF] p-3 text-center text-xs font-bold text-[#667085]">
                            Chưa chọn
                          </div>
                        )}
                      </div>

                      {/* Vet detail */}
                      <div>
                        <h4 className="mb-2 text-[11px] font-black tracking-widest text-[#7C6CF5] uppercase">
                          Bác sĩ dự kiến
                        </h4>
                        {selectedVet ? (
                          <div className="flex items-center gap-3.5 rounded-2xl border border-[#ECECF5] bg-white p-3 shadow-sm">
                            <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-[#ECECF5]">
                              <img
                                src={selectedVet.photoUrl}
                                alt={selectedVet.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-extrabold text-[#171725]">
                                {selectedVet.name}
                              </p>
                              <p className="mt-0.5 truncate text-[11.5px] font-semibold text-[#667085]">
                                {selectedVet.specialty}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1">
                                <Star className="size-3 fill-[#F59E0B] text-[#F59E0B]" />
                                <span className="text-[11.5px] font-black text-[#171725]">
                                  {selectedVet.rating.toFixed(1)} ({selectedVet.reviews}{' '}
                                  đánh giá)
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#ECECF5] bg-[#FAFAFF] p-3 text-center text-xs font-bold text-[#667085]">
                            Chưa chọn
                          </div>
                        )}
                      </div>

                      {/* Time detail */}
                      <div>
                        <h4 className="mb-2 text-[11px] font-black tracking-widest text-[#7C6CF5] uppercase">
                          Thời gian dự kiến
                        </h4>
                        {values.scheduledAt ? (
                          <div className="space-y-2 rounded-2xl border border-[#ECECF5] bg-white p-3.5 shadow-sm">
                            <div className="flex items-center gap-2.5 text-[13px] font-bold text-[#171725]">
                              <Calendar className="size-4.5 shrink-0 text-[#667085]" />
                              <span>
                                {confirmFmt.format(new Date(values.scheduledAt))}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-[13px] font-bold text-[#171725]">
                              <Clock className="size-4.5 shrink-0 text-[#667085]" />
                              <span>
                                {new Date(values.scheduledAt).toLocaleTimeString(
                                  'vi-VN',
                                  { hour: '2-digit', minute: '2-digit' },
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#ECECF5] bg-[#FAFAFF] p-3 text-center text-xs font-bold text-[#667085]">
                            Chưa chọn
                          </div>
                        )}
                      </div>

                      <div className="my-4 h-px w-full bg-[#ECECF5]" />

                      {/* Branch detail */}
                      <div>
                        <h4 className="mb-2 text-[11px] font-black tracking-widest text-[#7C6CF5] uppercase">
                          Chi nhánh
                        </h4>
                        <div className="space-y-2 rounded-2xl border border-[#ECECF5] bg-white p-3.5 shadow-sm">
                          <div className="flex items-center gap-2.5 text-[13.5px] font-bold text-[#171725]">
                            <MapPin className="size-4.5 shrink-0 text-[#667085]" />
                            <span>PetCare Clinic - Cầu Giấy</span>
                          </div>
                          <div className="ml-7 text-[11.5px] font-bold text-[#667085]">
                            123 Trần Duy Hưng, Cầu Giấy, Hà Nội
                          </div>
                        </div>
                      </div>

                      {/* Price box with Dribbble-level typography */}
                      <div className="mt-3 rounded-[18px] border border-[#7C6CF5]/10 bg-gradient-to-br from-[#7C6CF5]/5 to-[#A99CFF]/5 p-4 shadow-sm">
                        <h4 className="mb-1.5 text-[11px] font-black tracking-widest text-[#667085] uppercase">
                          Phí khám dự kiến
                        </h4>
                        <div className="text-2xl font-black tracking-tight text-[#7C6CF5]">
                          150.000đ
                        </div>
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-black tracking-wider text-[#667085] uppercase">
                          <CheckCircle2 className="size-3.5 stroke-[2.5px] text-[#22C55E]" />{' '}
                          Đã bao gồm VAT
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core values list */}
                <div className="space-y-1.5 rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_10px_30px_rgba(31,41,55,0.05)]">
                  <div className="flex items-center gap-3.5 rounded-xl bg-white p-3 transition-all hover:bg-[#FAFAFF]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#7C6CF5]/10 text-[#7C6CF5]">
                      <ShieldCheck className="size-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold text-[#171725]">
                        Bác sĩ giàu kinh nghiệm
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-[#667085]">
                        Đội ngũ bác sĩ chuyên môn cao
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 rounded-xl bg-white p-3 transition-all hover:bg-[#FAFAFF]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#7C6CF5]/10 text-[#7C6CF5]">
                      <Activity className="size-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold text-[#171725]">
                        Trang thiết bị hiện đại
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-[#667085]">
                        Máy móc, thiết bị tiên tiến
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 rounded-xl bg-white p-3 transition-all hover:bg-[#FAFAFF]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#7C6CF5]/10 text-[#7C6CF5]">
                      <Heart className="size-5 fill-[#7C6CF5] stroke-[2.5px]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold text-[#171725]">
                        Dịch vụ tận tâm
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-[#667085]">
                        Chăm sóc thú cưng như người thân
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
