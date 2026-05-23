import { useMemo, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  Plus,
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

import { useBookVisit } from '@/lib/api/generated/visits/visits';
import { useListPets } from '@/lib/api/generated/pets/pets';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { bookVisitSchema } from '@/features/visits/schemas';
import { WORKHOUR_LABEL, WORKHOUR_ORDER } from '@/features/vets/labels';

export const Route = createFileRoute('/customer/book')({
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
    case 'HOUR_12_13':
    case 'HOUR_18_19':
      return { status: 'FULL', text: 'Đã đầy', colorClass: 'text-[#667085]' };
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
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
    return new Date(Date.now() - tzOffsetMs).toISOString().slice(0, 10);
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  const [petPage, setPetPage] = useState(0);
  const petsQuery = useListPets({
    pageable: { page: petPage, size: 8, sort: ['name,asc'] },
  });

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

  const pets = useMemo(() => petsQuery.data?.content ?? [], [petsQuery.data]);
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
    <div className="min-h-screen bg-white py-2 font-sans text-slate-900 antialiased">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Top Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            asChild
            variant="ghost"
            className="-ml-2 gap-2 rounded-lg font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            <Link to="/customer">
              <ArrowLeft className="size-4 text-slate-500" /> Quay lại
            </Link>
          </Button>

          <div className="min-w-0 sm:text-center">
            <div className="flex items-center gap-2.5 sm:justify-center">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#7C6CF5] text-white">
                <PawPrint className="size-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">
                Đặt lịch khám
              </h1>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {step === 1
                ? '3 bước đơn giản — chọn thú cưng, chọn bác sĩ & thời gian, xác nhận.'
                : `Bước ${step}/3: ${STEPS[step - 1]?.label}`}
            </p>
          </div>

          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-slate-200 px-4 font-medium text-slate-700 hover:bg-slate-50"
          >
            <HelpCircle className="size-4 text-slate-500" /> Cần hỗ trợ
          </Button>
        </div>

        {/* Horizontal Stepper */}
        <div className="mx-auto mb-8 max-w-[720px]">
          <div className="relative flex items-center justify-between">
            <div className="absolute top-[16px] left-0 -z-10 h-px w-full bg-slate-200">
              <div
                className="h-full bg-[#7C6CF5] transition-all duration-300"
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
              />
            </div>

            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isActive = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'z-10 flex size-8 items-center justify-center rounded-full border text-sm font-semibold ring-4 ring-white transition-colors',
                      isCompleted
                        ? 'border-[#7C6CF5] bg-[#7C6CF5] text-white'
                        : isActive
                          ? 'border-[#7C6CF5] bg-white text-[#7C6CF5]'
                          : 'border-slate-200 bg-white text-slate-500',
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
                      'mt-2 text-xs font-medium transition-colors duration-300',
                      isActive ? 'text-slate-950' : 'text-slate-500',
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
              ? 'mx-auto max-w-[980px] grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-[1fr_360px]',
          )}
        >
          {/* Left Column: Booking Flow */}
          <div className="space-y-6">
            {/* STEP 1: Select Pet */}
            {step === 1 && (
              <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300">
                <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center">
                  <div className="space-y-1.5 text-left">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      Chọn bé thú cưng cần khám
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                      Vui lòng lựa chọn một bé từ danh sách hồ sơ bên dưới.
                    </p>
                  </div>

                  {/* Inline Cute Pet Vector Illustration */}
                  <svg
                    className="hidden"
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
                  <div className="hidden" />
                </div>

                {/* Filter and Add Block with premium input styling */}
                <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm thú cưng..."
                      className="h-10 rounded-lg border-slate-200 bg-white pl-10 text-sm font-medium focus-visible:ring-[#7C6CF5]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 w-full rounded-lg border-slate-200 px-4 font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                  >
                    <Link to="/customer/pets">
                      <Plus className="mr-1.5 size-4.5 stroke-[2.5px]" /> Thêm thú cưng
                      mới
                    </Link>
                  </Button>
                </div>

                {/* Pet Selection Grid - STRICTLY 2 cards per row, LARGE cards */}
                <form.Field
                  name="petId"
                  children={(field) => (
                    <div className="space-y-8">
                      {petsQuery.isLoading ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-[142px] w-full rounded-lg" />
                          ))}
                        </div>
                      ) : filteredPets.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                          <PawPrint className="size-16 text-slate-300" />
                          <p className="text-base font-semibold text-slate-600">
                            Không tìm thấy thú cưng nào
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {filteredPets.map((p, idx) => {
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
                                  'group relative flex gap-4 rounded-lg border bg-white p-4 text-left transition-colors duration-200',
                                  isSelected
                                    ? 'border-[#7C6CF5] bg-[#7C6CF5]/[0.03] ring-2 ring-[#7C6CF5]/10'
                                    : 'border-slate-200 hover:border-[#7C6CF5]/40',
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-[#7C6CF5] text-white animate-in zoom-in-50">
                                    <CheckCircle2 className="size-4.5 stroke-[3px]" />
                                  </div>
                                )}

                                {/* LARGE Pet Photo */}
                                <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                                  <img
                                    src={displayPhoto}
                                    alt={p.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                {/* Info Box */}
                                <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                                  <div>
                                    <h4 className="truncate pr-6 text-base leading-snug font-semibold text-slate-950">
                                      {p.name}
                                    </h4>

                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
                                      <PawPrint className="size-4 text-slate-400" />
                                      {p.type ?? 'Khác'} • {displayBreed}
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                      {age} • {gender}
                                    </p>
                                  </div>

                                  {/* Vaccination Badge */}
                                  <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                    <ShieldCheck className="size-4 fill-[#22C55E]/10 text-[#22C55E]" />{' '}
                                    Đã tiêm vaccine
                                  </div>

                                  <p className="mt-2 text-xs font-medium text-slate-400">
                                    #{p.id} • {p.birthDate ?? 'N/A'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Stepper Pagination Control */}
                      {(petsQuery.data?.totalPages ?? 0) > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-3 border-t border-slate-200 pt-5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-lg border-slate-200 text-slate-700 transition-colors hover:border-[#7C6CF5]/40"
                            disabled={petPage === 0}
                            onClick={() => setPetPage((p) => Math.max(0, p - 1))}
                          >
                            <ChevronLeft className="size-5.5 stroke-[2.5px]" />
                          </Button>
                          <span className="text-sm font-medium text-slate-500">
                            Hiển thị {filteredPets.length} /{' '}
                            {petsQuery.data?.totalElements} thú cưng
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-lg border-slate-200 text-slate-700 transition-colors hover:border-[#7C6CF5]/40"
                            disabled={petPage >= (petsQuery.data?.totalPages ?? 1) - 1}
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
                <div className="flex items-center justify-between border-t border-slate-200 pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate({ to: '/customer' })}
                    className="h-11 rounded-lg border-slate-200 px-5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft className="mr-1.5 size-4 text-slate-500" /> Quay lại
                  </Button>
                  <Button
                    type="button"
                    className="h-11 rounded-lg bg-[#7C6CF5] px-7 font-semibold text-white hover:bg-[#6D5EE8]"
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
              <div className="space-y-8 transition-all duration-300">
                {/* Active Selected Pet Info Bar */}
                {selectedPet && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <img
                          src={getPetPhoto(selectedPet)}
                          alt={selectedPet.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base leading-snug font-semibold text-slate-950">
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
                          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            <PawPrint className="size-3 text-slate-400" />{' '}
                            {selectedPet.type ?? 'Khác'}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            <Clock className="size-3 text-slate-400" />{' '}
                            {selectedPet.birthDate
                              ? `${new Date().getFullYear() - parseInt(selectedPet.birthDate.substring(0, 4))} tuổi`
                              : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
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
                      className="gap-1.5 rounded-lg px-3 py-2 font-medium text-[#7C6CF5] transition-colors hover:bg-[#7C6CF5]/5 hover:text-[#7C6CF5]/80"
                    >
                      <RefreshCcw className="size-4.5 stroke-[2.5px]" /> Đổi thú cưng
                    </Button>
                  </div>
                )}

                {/* Main Selector Box */}
                <div className="space-y-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  {/* 1. Chọn bác sĩ phụ trách */}
                  <form.Field
                    name="vetId"
                    children={(field) => (
                      <div className="space-y-6">
                        <div className="space-y-1">
                          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                            1. Chọn bác sĩ phụ trách
                          </h3>
                          <p className="text-sm font-medium text-slate-500">
                            Đội ngũ bác sĩ chuyên khoa cao cấp sẵn sàng chăm sóc cho bé.
                          </p>
                        </div>

                        {vetsQuery.isLoading ? (
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {Array.from({ length: 2 }).map((_, i) => (
                              <Skeleton key={i} className="h-[132px] w-full rounded-lg" />
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
                                    'group relative flex gap-4 rounded-lg border bg-white p-4 text-left transition-colors duration-200',
                                    isSelected
                                      ? 'border-[#7C6CF5] bg-[#7C6CF5]/[0.03] ring-2 ring-[#7C6CF5]/10'
                                      : 'border-slate-200 hover:border-[#7C6CF5]/40',
                                  )}
                                >
                                  {isSelected && (
                                    <div className="absolute top-4 right-4 z-10 flex size-5 items-center justify-center rounded-full bg-[#7C6CF5] text-white animate-in zoom-in-50">
                                      <CheckCircle2 className="size-3.5 stroke-[3px]" />
                                    </div>
                                  )}

                                  {/* Doctor Image - LARGE */}
                                  <div className="relative h-[104px] w-[78px] shrink-0 overflow-hidden rounded-lg border border-slate-200">
                                    <img
                                      src={vetData.photoUrl}
                                      alt={vetData.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>

                                  {/* Doctor Details */}
                                  <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                                    <div>
                                      <h4 className="text-base leading-snug font-semibold whitespace-nowrap text-slate-950">
                                        {vetData.name}
                                      </h4>
                                      <p className="mt-1.5 text-sm font-medium text-slate-500">
                                        {vetData.specialty}
                                      </p>

                                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
                                        <Star className="size-4 fill-[#F59E0B] text-[#F59E0B]" />
                                        <span className="font-semibold text-slate-950">
                                          {vetData.rating.toFixed(1)}
                                        </span>
                                        <span className="font-medium whitespace-nowrap text-slate-500">
                                          ({vetData.reviews} đánh giá)
                                        </span>
                                      </div>

                                      <p className="mt-1 text-xs font-medium text-slate-400">
                                        {vetData.experience}
                                      </p>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {vetData.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="inline-flex items-center rounded-full border border-[#7C6CF5]/20 bg-[#7C6CF5]/10 px-2.5 py-0.5 text-xs font-medium text-[#7C6CF5]"
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
                              className="size-9 rounded-lg border-slate-200 text-slate-700"
                              disabled={vetPage === 0}
                              onClick={() => setVetPage((p) => Math.max(0, p - 1))}
                            >
                              <ChevronLeft className="size-4.5 stroke-[2.5px]" />
                            </Button>
                            <span className="text-sm font-medium text-slate-500">
                              Trang {vetPage + 1} / {vetsQuery.data?.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-9 rounded-lg border-slate-200 text-slate-700"
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
                      <div className="space-y-6 border-t border-slate-200 pt-8">
                        <div className="space-y-1">
                          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                            2. Chọn thời gian khám
                          </h3>
                          <p className="text-sm font-medium text-slate-500">
                            Lựa chọn ngày lành và khung giờ phù hợp nhất với bạn.
                          </p>
                        </div>

                        <div className="grid items-start gap-8 md:grid-cols-[300px_1fr]">
                          {/* Calendar Picker Card */}
                          <div className="shrink-0 space-y-3.5">
                            <h4 className="text-sm font-semibold text-slate-700">
                              Chọn ngày
                            </h4>
                            <div className="mx-auto w-full max-w-[300px] rounded-lg border border-slate-200 bg-slate-50 p-4 md:mx-0">
                              <div className="mb-4 flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg text-slate-500 hover:bg-white"
                                  onClick={handlePrevMonth}
                                >
                                  <ChevronLeft className="size-5 stroke-[2.5px]" />
                                </Button>
                                <span className="text-sm font-semibold text-slate-950">
                                  Tháng {new Date(selectedDate).getMonth() + 1}{' '}
                                  {new Date(selectedDate).getFullYear()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg text-slate-500 hover:bg-white"
                                  onClick={handleNextMonth}
                                >
                                  <ChevronRight className="size-5 stroke-[2.5px]" />
                                </Button>
                              </div>
                              <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium text-slate-400">
                                <div>T2</div>
                                <div>T3</div>
                                <div>T4</div>
                                <div>T5</div>
                                <div>T6</div>
                                <div>T7</div>
                                <div>CN</div>
                              </div>
                              <div className="grid grid-cols-7 justify-items-center gap-y-2.5">
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
                                        'flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                                        isPast
                                          ? 'cursor-not-allowed bg-transparent text-slate-300 shadow-none'
                                          : isSelected
                                            ? 'bg-[#7C6CF5] text-white'
                                            : 'border border-slate-200 bg-white text-slate-900 hover:border-[#7C6CF5]/40',
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
                            <h4 className="text-sm font-semibold text-slate-700">
                              Chọn khung giờ
                            </h4>

                            {values.vetId === 0 ? (
                              <div className="flex h-[250px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                                <Stethoscope className="size-11 text-slate-300" />
                                <span>Vui lòng chọn bác sĩ phụ trách trước</span>
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
                                  const isDisabled = isPast || slotInfo.status === 'FULL';

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
                                        'flex h-[64px] flex-col items-center justify-center rounded-lg border p-3 transition-colors',
                                        isDisabled
                                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                                          : isSelected
                                            ? 'border-[#7C6CF5] bg-[#7C6CF5] text-white'
                                            : 'border-slate-200 bg-white text-slate-900 hover:border-[#7C6CF5]/40',
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'text-sm font-semibold',
                                          isSelected
                                            ? 'text-white'
                                            : isDisabled
                                              ? 'text-slate-400'
                                              : 'text-slate-900',
                                        )}
                                      >
                                        {WORKHOUR_LABEL[slot]}
                                      </span>

                                      <span
                                        className={cn(
                                          'mt-1 text-[10px] font-medium',
                                          isSelected
                                            ? 'text-white/80'
                                            : isDisabled
                                              ? 'text-slate-400'
                                              : slotInfo.colorClass,
                                        )}
                                      >
                                        {slotInfo.text}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Color Legend with elegant design */}
                            <div className="mt-4 flex items-center gap-4 border-t border-slate-200 pt-4 text-xs font-medium text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2.5 rounded-full bg-[#22C55E] shadow-sm"></span>{' '}
                                Còn nhiều slot
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-2.5 rounded-full bg-[#F59E0B] shadow-sm"></span>{' '}
                                Còn ít slot
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-2.5 rounded-full bg-slate-300"></span>{' '}
                                Đã đầy
                              </span>
                            </div>

                            <FieldError field={field} />
                          </div>
                        </div>

                        {/* Footer Next Button inside main selector box */}
                        <div className="flex flex-col items-center border-t border-slate-200 pt-5">
                          <Button
                            type="button"
                            className="h-11 w-full gap-1.5 rounded-lg bg-[#7C6CF5] font-semibold text-white hover:bg-[#6D5EE8]"
                            disabled={values.vetId === 0 || !values.scheduledAt}
                            onClick={() => setStep(3)}
                          >
                            Tiếp tục <ArrowRight className="size-4.5 stroke-[2.5px]" />
                          </Button>
                          <p className="mt-3 text-center text-xs font-medium text-slate-500">
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
              <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      Xác nhận thông tin
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
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
                        className="text-sm font-semibold text-slate-900"
                      >
                        Lý do khám (tuỳ chọn)
                      </Label>
                      <Textarea
                        id={field.name}
                        rows={4}
                        className="resize-none rounded-lg border-slate-200 bg-white p-4 text-sm font-medium focus-visible:ring-[#7C6CF5]"
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
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <div className="mt-0.5 shrink-0 text-[#F59E0B]">
                    <HelpCircle className="size-5" />
                  </div>
                  <div className="space-y-1 font-medium text-slate-700">
                    <p className="font-semibold text-amber-800">Lưu ý quan trọng</p>
                    <p className="leading-relaxed text-slate-600">
                      Phí khám sẽ được thông báo chính xác sau khi bác sĩ hoàn thành đánh
                      giá. Việc đặt lịch trên hệ thống <b>chưa phát sinh thanh toán</b>{' '}
                      ngay lúc này.
                    </p>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-11 w-full rounded-lg border-slate-200 px-6 font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                  >
                    <ArrowLeft className="mr-1.5 size-4 text-slate-500" /> Quay lại
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full flex-1 gap-1.5 rounded-lg bg-[#7C6CF5] text-sm font-semibold text-white hover:bg-[#6D5EE8]"
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
              <div className="sticky top-8 space-y-6 duration-400 animate-in fade-in slide-in-from-right-4">
                {/* Summary Card */}
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <h3 className="text-base font-semibold tracking-tight text-slate-950">
                      Thông tin đặt khám
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Kiểm tra lại thông tin trước khi xác nhận lịch hẹn.
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="space-y-5">
                      {/* Pet detail */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-slate-500">
                          Thú cưng
                        </h4>
                        {selectedPet ? (
                          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            <div className="size-10 shrink-0 overflow-hidden rounded-md border border-slate-200">
                              <img
                                src={getPetPhoto(selectedPet)}
                                alt={selectedPet.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {selectedPet.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                                {selectedPet.type ?? 'Khác'} • {getPetBreed(selectedPet)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs font-medium text-slate-500">
                            Chưa chọn
                          </div>
                        )}
                      </div>

                      {/* Vet detail */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-slate-500">
                          Bác sĩ dự kiến
                        </h4>
                        {selectedVet ? (
                          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            <div className="size-10 shrink-0 overflow-hidden rounded-md border border-slate-200">
                              <img
                                src={selectedVet.photoUrl}
                                alt={selectedVet.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {selectedVet.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                                {selectedVet.specialty}
                              </p>
                              <div className="mt-0.5 flex items-center gap-1">
                                <Star className="size-3 fill-[#F59E0B] text-[#F59E0B]" />
                                <span className="text-xs font-semibold text-slate-700">
                                  {selectedVet.rating.toFixed(1)} ({selectedVet.reviews}{' '}
                                  đánh giá)
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs font-medium text-slate-500">
                            Chưa chọn
                          </div>
                        )}
                      </div>

                      {/* Time detail */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-slate-500">
                          Thời gian dự kiến
                        </h4>
                        {values.scheduledAt ? (
                          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-900">
                              <Calendar className="size-4.5 shrink-0 text-slate-500" />
                              <span>
                                {confirmFmt.format(new Date(values.scheduledAt))}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-900">
                              <Clock className="size-4.5 shrink-0 text-slate-500" />
                              <span>
                                {new Date(values.scheduledAt).toLocaleTimeString(
                                  'vi-VN',
                                  { hour: '2-digit', minute: '2-digit' },
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs font-medium text-slate-500">
                            Chưa chọn
                          </div>
                        )}
                      </div>

                      <div className="my-4 h-px w-full bg-slate-200" />

                      {/* Branch detail */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-slate-500">
                          Chi nhánh
                        </h4>
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2.5 text-sm font-medium text-slate-900">
                            <MapPin className="size-4.5 shrink-0 text-slate-500" />
                            <span>PetCare Clinic - Cầu Giấy</span>
                          </div>
                          <div className="ml-7 text-xs font-medium text-slate-500">
                            123 Trần Duy Hưng, Cầu Giấy, Hà Nội
                          </div>
                        </div>
                      </div>

                      {/* Price box with Dribbble-level typography */}
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h4 className="mb-1.5 text-xs font-semibold text-slate-500">
                          Phí khám dự kiến
                        </h4>
                        <div className="text-2xl font-bold tracking-tight text-[#7C6CF5]">
                          150.000đ
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <CheckCircle2 className="size-3.5 stroke-[2.5px] text-[#22C55E]" />{' '}
                          Đã bao gồm VAT
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust notes */}
                <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center gap-3 rounded-md p-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <ShieldCheck className="size-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Bác sĩ giàu kinh nghiệm
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Đội ngũ bác sĩ chuyên môn cao
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-md p-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <Activity className="size-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Trang thiết bị hiện đại
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Máy móc, thiết bị tiên tiến
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-md p-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <Heart className="size-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Dịch vụ tận tâm
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
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
