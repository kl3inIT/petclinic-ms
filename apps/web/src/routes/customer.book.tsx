import { useMemo, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  PawPrint,
  Stethoscope,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldError } from '@/lib/form/FieldError';
import { cn } from '@/lib/utils';

import { useBookVisit } from '@/lib/api/generated/visits/visits';
import { useListPets } from '@/lib/api/generated/pets/pets';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { bookVisitSchema } from '@/features/visits/schemas';

export const Route = createFileRoute('/customer/book')({
  component: BookVisitPage,
});

const STEPS = [
  { id: 1, label: 'Thú cưng', icon: PawPrint },
  { id: 2, label: 'Bác sĩ & thời gian', icon: Stethoscope },
  { id: 3, label: 'Xác nhận', icon: CheckCircle2 },
] as const;

function BookVisitPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);

  const petsQuery = useListPets({ pageable: { page: 0, size: 200, sort: ['name,asc'] } });
  const vetsQuery = useListVets({ pageable: { page: 0, size: 200, sort: ['lastName,asc'] } });

  const bookMutation = useBookVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đặt lịch khám thành công! Bạn sẽ nhận email xác nhận.');
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

  const values = form.state.values;
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === values.petId),
    [pets, values.petId],
  );
  const selectedVet = useMemo(
    () => vets.find((v) => v.id === values.vetId),
    [vets, values.vetId],
  );

  const canNextFromStep1 = values.petId > 0;
  const canNextFromStep2 =
    values.vetId > 0 &&
    !!values.scheduledAt &&
    new Date(values.scheduledAt).getTime() > Date.now();

  // Min datetime-local: làm tròn lên đầu giờ tiếp theo, tối thiểu sau 1 giờ.
  const minDateTime = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  }, []);

  const confirmFmt = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' }),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/customer">
            <ArrowLeft className="size-4" /> Quay lại
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Đặt lịch khám</h1>
          <p className="text-sm text-muted-foreground">
            3 bước đơn giản — chọn thú cưng, chọn bác sĩ &amp; thời gian, xác nhận.
          </p>
        </div>
      </div>

      <Stepper current={step} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Bước {step}: {STEPS[step - 1]?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ───────── Step 1: Pet ───────── */}
            {step === 1 ? (
              petsQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : pets.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <PawPrint className="size-12 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium">Bạn chưa có thú cưng nào</p>
                    <p className="text-sm text-muted-foreground">
                      Thêm hồ sơ thú cưng trước khi đặt lịch khám.
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/customer/pets">Thêm thú cưng</Link>
                  </Button>
                </div>
              ) : (
                <form.Field
                  name="petId"
                  children={(field) => (
                    <div className="space-y-3">
                      <Label>Chọn thú cưng cần khám</Label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {pets.map((p) => {
                          const checked = field.state.value === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => field.handleChange(p.id ?? 0)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary',
                                checked
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border bg-card',
                              )}
                            >
                              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <PawPrint className="size-6" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  #{p.id} • {p.type ?? 'Khác'}
                                  {p.birthDate ? ` • ${p.birthDate}` : ''}
                                </p>
                              </div>
                              {checked ? (
                                <CheckCircle2 className="size-5 text-primary" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      <FieldError field={field} />
                    </div>
                  )}
                />
              )
            ) : null}

            {/* ───────── Step 2: Vet + Time ───────── */}
            {step === 2 ? (
              <div className="space-y-5">
                <form.Field
                  name="vetId"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Bác sĩ phụ trách</Label>
                      <Select
                        disabled={vetsQuery.isLoading}
                        value={field.state.value > 0 ? String(field.state.value) : ''}
                        onValueChange={(v) => field.handleChange(Number(v))}
                      >
                        <SelectTrigger
                          id={field.name}
                          onBlur={field.handleBlur}
                          className="w-full"
                        >
                          <SelectValue
                            placeholder={vetsQuery.isLoading ? 'Đang tải…' : 'Chọn bác sĩ'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {vets.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              BS. {v.firstName} {v.lastName}
                              {v.specialties && v.specialties.length > 0
                                ? ` — ${v.specialties.map((s) => s.name).join(', ')}`
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError field={field} />
                    </div>
                  )}
                />

                <form.Field
                  name="scheduledAt"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Thời gian khám</Label>
                      <Input
                        id={field.name}
                        type="datetime-local"
                        min={minDateTime}
                        step={3600}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Gợi ý: đặt trước ít nhất 1 giờ để chúng tôi kịp chuẩn bị.
                      </p>
                      <FieldError field={field} />
                    </div>
                  )}
                />

                <form.Field
                  name="reason"
                  children={(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Lý do khám (tuỳ chọn)</Label>
                      <Textarea
                        id={field.name}
                        rows={4}
                        placeholder="VD: bé bỏ ăn 2 ngày, có dấu hiệu mệt mỏi, cần tiêm vắc-xin định kỳ…"
                        value={field.state.value ?? ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError field={field} />
                    </div>
                  )}
                />
              </div>
            ) : null}

            {/* ───────── Step 3: Confirm ───────── */}
            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Vui lòng kiểm tra thông tin trước khi xác nhận. Bạn có thể huỷ lịch
                  trước thời gian khám.
                </p>

                <div className="space-y-1 rounded-lg border bg-muted/30 p-5">
                  <Row
                    label="Thú cưng"
                    value={
                      selectedPet ? `${selectedPet.name} (${selectedPet.type ?? '—'})` : '—'
                    }
                  />
                  <Row
                    label="Bác sĩ"
                    value={
                      selectedVet
                        ? `BS. ${selectedVet.firstName} ${selectedVet.lastName}`
                        : '—'
                    }
                  />
                  <Row
                    label="Thời gian"
                    value={
                      values.scheduledAt
                        ? confirmFmt.format(new Date(values.scheduledAt))
                        : '—'
                    }
                  />
                  <Row label="Lý do" value={values.reason || '—'} />
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  ⓘ Phí khám sẽ được thông báo sau khi bác sĩ hoàn thành đánh giá. Đặt
                  lịch chưa phát sinh thanh toán.
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="size-4" /> Quay lại
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={
                    (step === 1 && !canNextFromStep1) ||
                    (step === 2 && !canNextFromStep2)
                  }
                >
                  Tiếp tục <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={bookMutation.isPending}>
                  <CalendarCheck className="size-4" />
                  {bookMutation.isPending ? 'Đang xác nhận…' : 'Xác nhận đặt lịch'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-between gap-2">
      {STEPS.map((s, idx) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                    ? 'border-primary bg-white text-primary'
                    : 'border-muted bg-white text-muted-foreground',
              )}
            >
              {done ? <CheckCircle2 className="size-4" /> : s.id}
            </div>
            <div className="hidden sm:block">
              <p
                className={cn(
                  'text-xs font-medium',
                  active || done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </p>
            </div>
            {idx < STEPS.length - 1 ? (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded',
                  done ? 'bg-primary' : 'bg-muted',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-none">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
