import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  PawPrint,
  Search,
  Star,
  Stethoscope,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { FieldError } from '@/lib/form/FieldError';
import { cn } from '@/lib/utils';
import { useGetMyOwnerProfile } from '@/lib/api/generated/owners/owners';
import { useListVetWorkSchedule } from '@/lib/api/generated/vet-work-schedule/vet-work-schedule';
import { useBookVisit, useGetSlotAvailability } from '@/lib/api/generated/visits/visits';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { bookVisitSchema } from '@/features/visits/schemas';
import { vnSpecialty } from '@/features/visits/labels';
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

const PET_PAGE_SIZE = 6;
const VET_PAGE_SIZE = 6;

/** Tuổi thú cưng dẫn xuất từ birthDate thật. < 1 năm → hiển thị theo tháng. */
function petAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 1) return months <= 0 ? '< 1 tháng' : `${months} tháng`;
  return `${years} tuổi`;
}

/** Map VetResponse (BE) → props hiển thị. Tất cả dẫn xuất từ dữ liệu thật. */
function getVetDisplayData(v: {
  id?: number;
  firstName?: string;
  lastName?: string;
  specialties?: Array<{ name?: string }>;
  photoUrl?: string;
  averageRating?: number;
  cardCode?: string;
}) {
  const fullName = `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim() || 'Bác sĩ thú y';
  const specs = (v.specialties ?? []).map((s) => vnSpecialty(s.name)).filter(Boolean);
  const initials =
    `${v.firstName?.[0] ?? ''}${v.lastName?.[0] ?? ''}`.toUpperCase() || 'BS';
  return {
    id: v.id,
    name: `BS. ${fullName}`,
    initials,
    photoUrl: v.photoUrl && v.photoUrl.length > 0 ? v.photoUrl : null,
    specialty: specs[0] ?? 'Đa khoa',
    rating: v.averageRating ?? 0,
    cardCode: v.cardCode ?? (v.id != null ? `#${v.id}` : ''),
    tags: specs.length > 0 ? specs : ['Đa khoa'],
  };
}

/**
 * Trạng thái slot từ `remaining` thật (capacity mặc định 2 — VisitServiceImpl).
 * remaining 0 → đầy; 1 → sắp đầy (warning); ≥2 → trống (success).
 */
function slotStatus(remaining: number | undefined) {
  if (remaining === undefined)
    return { text: '...', tone: 'muted' as const, full: false };
  if (remaining <= 0) return { text: 'Đã đầy', tone: 'muted' as const, full: true };
  if (remaining === 1) return { text: 'Còn 1', tone: 'warning' as const, full: false };
  return { text: `Còn ${remaining}`, tone: 'success' as const, full: false };
}

/**
 * Ô tìm kiếm "deferred": chỉ áp dụng khi người dùng bấm Enter hoặc nút "Tìm"
 * (không filter tức thì khi gõ). Giữ giá trị nháp nội bộ; `onSearch` đẩy term đã
 * trim lên cha. `preventDefault` ở Enter để KHÔNG submit form đặt lịch bao ngoài.
 */
function SearchBar({
  placeholder,
  defaultValue = '',
  onSearch,
}: {
  placeholder: string;
  defaultValue?: string;
  onSearch: (term: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const submit = () => onSearch(value.trim());
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="h-10 pl-9"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="h-10 shrink-0"
        onClick={submit}
      >
        Tìm
      </Button>
    </div>
  );
}

function BookVisitPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/customer/book' });
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [vetSearch, setVetSearch] = useState('');
  const [petPage, setPetPage] = useState(0);
  const [vetPage, setVetPage] = useState(0);
  const appliedPetIdRef = useRef<number | undefined>(undefined);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
    return new Date(Date.now() - tzOffsetMs).toISOString().slice(0, 10);
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  const ownerQuery = useGetMyOwnerProfile();
  const ownerLoading = ownerQuery.isLoading || ownerQuery.isError;

  const vetsQuery = useListVets({
    lastName: vetSearch || undefined,
    pageable: { page: vetPage, size: VET_PAGE_SIZE, sort: ['lastName,asc'] },
  });
  const vetsLoading = vetsQuery.isLoading || vetsQuery.isError;

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

  const values = useStore(form.store, (state) => state.values);

  const pets = useMemo(
    () =>
      [...(ownerQuery.data?.pets ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      ),
    [ownerQuery.data],
  );
  const vets = useMemo(() => vetsQuery.data?.content ?? [], [vetsQuery.data]);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === values.petId),
    [pets, values.petId],
  );
  const selectedVetRaw = useMemo(
    () => vets.find((v) => v.id === values.vetId),
    [vets, values.vetId],
  );
  const selectedVet = useMemo(
    () => (selectedVetRaw ? getVetDisplayData(selectedVetRaw) : null),
    [selectedVetRaw],
  );

  // Deep-link: /customer/book?petId=X (từ trang Thú cưng) → chọn sẵn bé đó.
  useEffect(() => {
    const requestedPetId = search.petId;
    if (!requestedPetId || appliedPetIdRef.current === requestedPetId) return;
    const petIndex = pets.findIndex((pet) => pet.id === requestedPetId);
    if (petIndex < 0) return;
    appliedPetIdRef.current = requestedPetId;
    form.setFieldValue('petId', requestedPetId);
    setPetPage(Math.floor(petIndex / PET_PAGE_SIZE));
  }, [form, pets, search.petId]);

  const vetScheduleQuery = useListVetWorkSchedule(values.vetId, {
    query: { enabled: values.vetId > 0 },
  });
  const availabilityQuery = useGetSlotAvailability(
    { vetId: values.vetId, date: selectedDate },
    { query: { enabled: values.vetId > 0 && !!selectedDate } },
  );
  const slotLoading =
    vetScheduleQuery.isLoading ||
    vetScheduleQuery.isError ||
    availabilityQuery.isLoading ||
    availabilityQuery.isError;

  const remainingBySlot = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of availabilityQuery.data?.slots ?? []) {
      if (s.workHour && typeof s.remaining === 'number') map.set(s.workHour, s.remaining);
    }
    return map;
  }, [availabilityQuery.data]);

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

  const confirmFmt = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }),
    [],
  );

  const calendarDays = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const emptyPrefix = firstDay === 0 ? 6 : firstDay - 1;
    const days: (number | null)[] = [];
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
  const totalPetPages = Math.max(1, Math.ceil(filteredPets.length / PET_PAGE_SIZE));
  const pagedPets = useMemo(
    () =>
      filteredPets.slice(
        petPage * PET_PAGE_SIZE,
        petPage * PET_PAGE_SIZE + PET_PAGE_SIZE,
      ),
    [filteredPets, petPage],
  );

  const handleMonthShift = (delta: number) => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + delta);
    d.setDate(1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const canSubmit =
    values.petId > 0 &&
    values.vetId > 0 &&
    !!values.scheduledAt &&
    !bookMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 h-8 gap-1.5 text-muted-foreground"
          >
            <Link to="/customer">
              <ArrowLeft className="size-4" /> Quay lại
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Đặt lịch khám
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn thú cưng, bác sĩ và thời gian phù hợp. Bạn xác nhận ở cột bên phải.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        className="grid items-start gap-6 lg:grid-cols-[1fr_330px]"
      >
        {/* Cột trái: các bước cuộn dọc */}
        <div className="space-y-5">
          {/* 1 — Thú cưng */}
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeading
              step={1}
              title="Chọn thú cưng"
              subtitle="Các bé trong hồ sơ của bạn."
            />

            <div className="mt-4">
              <SearchBar
                placeholder="Tìm theo tên hoặc loài…"
                defaultValue={searchTerm}
                onSearch={(term) => {
                  setSearchTerm(term);
                  setPetPage(0);
                }}
              />
            </div>

            <form.Field
              name="petId"
              children={(field) => (
                <div className="mt-4 space-y-4">
                  {ownerLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[88px] rounded-lg" />
                      ))}
                    </div>
                  ) : filteredPets.length === 0 ? (
                    <EmptyState
                      icon={<PawPrint className="size-8 text-muted-foreground/50" />}
                      title="Không tìm thấy thú cưng"
                      hint="Thêm thú cưng ở mục Thú cưng trước khi đặt lịch."
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {pagedPets.map((p) => {
                        const isSelected = field.state.value === p.id;
                        const age = petAge(p.birthDate);
                        return (
                          <SelectTile
                            key={p.id}
                            selected={isSelected}
                            onClick={() => field.handleChange(p.id ?? 0)}
                          >
                            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-accent text-accent-foreground">
                              {p.photoUrl ? (
                                <img
                                  src={p.photoUrl}
                                  alt={p.name ?? ''}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <PawPrint className="size-5" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {p.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {[
                                  p.type ?? 'Khác',
                                  age,
                                  p.weight ? `${p.weight} kg` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            </div>
                          </SelectTile>
                        );
                      })}
                    </div>
                  )}

                  {totalPetPages > 1 && (
                    <Pager
                      page={petPage}
                      totalPages={totalPetPages}
                      onPrev={() => setPetPage((p) => Math.max(0, p - 1))}
                      onNext={() => setPetPage((p) => Math.min(totalPetPages - 1, p + 1))}
                      label={`${filteredPets.length} thú cưng`}
                    />
                  )}
                  <FieldError field={field} />
                </div>
              )}
            />
          </section>

          {/* 2 — Bác sĩ */}
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeading
              step={2}
              title="Chọn bác sĩ"
              subtitle="Đội ngũ bác sĩ thú y của phòng khám."
            />

            <div className="mt-4">
              <SearchBar
                placeholder="Tìm bác sĩ theo tên…"
                defaultValue={vetSearch}
                onSearch={(term) => {
                  setVetSearch(term);
                  setVetPage(0);
                }}
              />
            </div>

            <form.Field
              name="vetId"
              children={(field) => (
                <div className="mt-4 space-y-4">
                  {vetsLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-[96px] rounded-lg" />
                      ))}
                    </div>
                  ) : vets.length === 0 ? (
                    <EmptyState
                      icon={<Stethoscope className="size-8 text-muted-foreground/50" />}
                      title={
                        vetSearch ? 'Không tìm thấy bác sĩ' : 'Chưa có bác sĩ khả dụng'
                      }
                      hint={
                        vetSearch ? `Không có bác sĩ khớp "${vetSearch}".` : undefined
                      }
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {vets.map((v) => {
                        const isSelected = field.state.value === v.id;
                        const vetData = getVetDisplayData(v);
                        return (
                          <SelectTile
                            key={v.id}
                            selected={isSelected}
                            onClick={() => {
                              field.handleChange(v.id ?? 0);
                              form.setFieldValue('scheduledAt', '');
                              setSelectedTimeSlot(null);
                            }}
                          >
                            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted text-sm font-semibold text-muted-foreground">
                              {vetData.photoUrl ? (
                                <img
                                  src={vetData.photoUrl}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                vetData.initials
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {vetData.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {vetData.specialty}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Star
                                  className={cn(
                                    'size-3.5',
                                    vetData.rating > 0
                                      ? 'fill-warning text-warning'
                                      : 'text-muted-foreground/40',
                                  )}
                                />
                                {vetData.rating > 0 ? (
                                  <span className="font-medium text-foreground">
                                    {vetData.rating.toFixed(1)}
                                  </span>
                                ) : (
                                  <span>Chưa có đánh giá</span>
                                )}
                              </div>
                            </div>
                          </SelectTile>
                        );
                      })}
                    </div>
                  )}

                  {(vetsQuery.data?.totalPages ?? 0) > 1 && (
                    <Pager
                      page={vetPage}
                      totalPages={vetsQuery.data?.totalPages ?? 1}
                      onPrev={() => setVetPage((p) => Math.max(0, p - 1))}
                      onNext={() =>
                        setVetPage((p) =>
                          Math.min((vetsQuery.data?.totalPages ?? 1) - 1, p + 1),
                        )
                      }
                      label={`${vetsQuery.data?.totalElements ?? 0} bác sĩ`}
                    />
                  )}
                  <FieldError field={field} />
                </div>
              )}
            />
          </section>

          {/* 3 — Thời gian */}
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeading
              step={3}
              title="Chọn thời gian"
              subtitle="Chọn ngày và khung giờ còn trống."
            />

            <form.Field
              name="scheduledAt"
              children={(field) => (
                <div className="mt-4 grid items-start gap-5 md:grid-cols-[260px_1fr]">
                  {/* Lịch */}
                  <div className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-md text-muted-foreground"
                        onClick={() => handleMonthShift(-1)}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <span className="text-sm font-semibold text-foreground">
                        Tháng {new Date(selectedDate).getMonth() + 1}{' '}
                        {new Date(selectedDate).getFullYear()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-md text-muted-foreground"
                        onClick={() => handleMonthShift(1)}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                    <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 justify-items-center gap-y-1">
                      {calendarDays.map((day, idx) => {
                        if (!day) return <div key={idx} className="size-8" />;
                        const base = new Date(selectedDate);
                        const currentStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
                              'flex size-8 items-center justify-center rounded-md text-[13px] transition-colors',
                              isPast
                                ? 'cursor-not-allowed text-muted-foreground/30'
                                : isSelected
                                  ? 'bg-primary font-semibold text-primary-foreground'
                                  : 'text-foreground hover:bg-accent',
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Khung giờ */}
                  <div>
                    {values.vetId === 0 ? (
                      <EmptyState
                        icon={<Stethoscope className="size-8 text-muted-foreground/50" />}
                        title="Chọn bác sĩ trước"
                        hint="Khung giờ trống sẽ hiển thị sau khi chọn bác sĩ."
                        className="h-full min-h-[256px]"
                      />
                    ) : slotLoading ? (
                      // Skeleton mirror lưới thật (12 ô + chú thích) để chiều cao
                      // không đổi khi load → tránh nhảy layout lúc đổi ngày.
                      <>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          {WORKHOUR_ORDER.map((slot) => (
                            <Skeleton key={slot} className="h-[50px] rounded-md" />
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-3 w-14 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </>
                    ) : availableSlotKeys.size === 0 ? (
                      <EmptyState
                        icon={<Clock className="size-8 text-muted-foreground/50" />}
                        title="Không có khung giờ trống"
                        hint="Bác sĩ không có lịch làm việc trong ngày này. Vui lòng chọn ngày khác."
                        className="h-full min-h-[256px]"
                      />
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          {WORKHOUR_ORDER.map((slot) => {
                            const isSelected = selectedTimeSlot === slot;
                            const hour = parseInt(
                              slot.replace('HOUR_', '').split('_')[0] || '0',
                              10,
                            );
                            const isToday =
                              selectedDate === new Date().toISOString().slice(0, 10);
                            const isPast = isToday && hour <= new Date().getHours();
                            const isInSchedule = availableSlotKeys.has(slot);
                            const remaining = remainingBySlot.get(slot);
                            const status = slotStatus(remaining);
                            const isDisabled = isPast || !isInSchedule || status.full;
                            const statusText = isInSchedule ? status.text : 'Nghỉ';

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
                                  'flex flex-col items-center justify-center rounded-md border py-2 text-center transition-colors',
                                  isDisabled
                                    ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50'
                                    : isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent',
                                )}
                              >
                                <span className="text-[13px] font-semibold">
                                  {WORKHOUR_LABEL[slot]}
                                </span>
                                <span
                                  className={cn(
                                    'mt-0.5 text-[10px] font-medium',
                                    isSelected
                                      ? 'text-primary-foreground/80'
                                      : isDisabled
                                        ? 'text-muted-foreground/50'
                                        : status.tone === 'success'
                                          ? 'text-success'
                                          : status.tone === 'warning'
                                            ? 'text-warning'
                                            : 'text-muted-foreground',
                                  )}
                                >
                                  {statusText}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                          <Legend className="bg-success" label="Còn nhiều" />
                          <Legend className="bg-warning" label="Sắp đầy" />
                          <Legend className="bg-muted-foreground/40" label="Đầy / nghỉ" />
                        </div>
                      </>
                    )}
                    <FieldError field={field} />
                  </div>
                </div>
              )}
            />
          </section>

          {/* 4 — Lý do khám */}
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeading
              step={4}
              title="Lý do khám"
              subtitle="Tuỳ chọn — giúp bác sĩ chuẩn bị tốt hơn."
            />
            <form.Field
              name="reason"
              children={(field) => (
                <div className="mt-4 space-y-2">
                  <Label htmlFor={field.name} className="sr-only">
                    Lý do khám
                  </Label>
                  <Textarea
                    id={field.name}
                    rows={3}
                    className="resize-none"
                    placeholder="VD: Bé bỏ ăn 2 ngày, cần tiêm vắc-xin định kỳ…"
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </section>
        </div>

        {/* Cột phải: tóm tắt sticky */}
        <aside className="lg:sticky lg:top-6">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Tóm tắt lịch hẹn</h2>
            </div>
            <div className="space-y-4 px-5 py-4">
              <SummaryRow label="Thú cưng">
                {selectedPet ? (
                  <span className="font-medium text-foreground">
                    {selectedPet.name}
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({selectedPet.type ?? 'Khác'})
                    </span>
                  </span>
                ) : (
                  <Pending />
                )}
              </SummaryRow>

              <SummaryRow label="Bác sĩ">
                {selectedVet ? (
                  <span className="font-medium text-foreground">{selectedVet.name}</span>
                ) : (
                  <Pending />
                )}
              </SummaryRow>

              <SummaryRow label="Thời gian">
                {values.scheduledAt ? (
                  <span className="font-medium text-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck className="size-3.5 text-muted-foreground" />
                      {confirmFmt.format(new Date(values.scheduledAt))}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {new Date(values.scheduledAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                ) : (
                  <Pending />
                )}
              </SummaryRow>

              <Separator />

              <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  Đặt lịch{' '}
                  <b className="font-medium text-foreground">chưa phát sinh thanh toán</b>
                  . Phí khám được bác sĩ thông báo sau khi đánh giá.
                </p>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 text-sm font-semibold"
                disabled={!canSubmit}
              >
                <CalendarCheck className="size-4" />
                {bookMutation.isPending ? 'Đang xử lý…' : 'Xác nhận đặt lịch'}
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ---------- Presentational helpers (local) ---------- */

function SectionHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
        {step}
      </span>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SelectTile({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        selected
          ? 'border-primary bg-accent/50 ring-1 ring-primary'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      {selected && (
        <CheckCircle2 className="absolute top-2.5 right-2.5 size-4 text-primary" />
      )}
      {children}
    </button>
  );
}

function Pager({
  page,
  totalPages,
  onPrev,
  onNext,
  label,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 border-t pt-3">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page === 0}
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        Trang {page + 1}/{totalPages} • {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page >= totalPages - 1}
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  className,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center',
        className,
      )}
    >
      {icon}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {hint && <p className="max-w-[260px] text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', className)} />
      {label}
    </span>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Pending() {
  return <span className="text-sm text-muted-foreground/60">Chưa chọn</span>;
}
