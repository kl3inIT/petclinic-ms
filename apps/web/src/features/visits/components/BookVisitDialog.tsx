import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

import { useBookVisit } from '@/lib/api/generated/visits/visits';
import { useListPets } from '@/lib/api/generated/pets/pets';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { bookVisitSchema, type BookVisitInput } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookVisitDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const petsQuery = useListPets({ pageable: { page: 0, size: 200, sort: ['name,asc'] } });
  const vetsQuery = useListVets({ pageable: { page: 0, size: 200, sort: ['lastName,asc'] } });

  const form = useForm<BookVisitInput>({
    resolver: zodResolver(bookVisitSchema),
    defaultValues: { petId: 0, vetId: 0, scheduledAt: '', reason: '' },
  });

  const bookMutation = useBookVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đặt lịch khám thành công');
        // Invalidate mọi cache visits — đơn giản hơn match queryKey từng cái
        void qc.invalidateQueries({ queryKey: ['/api/v1/visits'] });
        form.reset();
        onOpenChange(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Đặt lịch thất bại');
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt lịch khám mới</DialogTitle>
          <DialogDescription>
            Chọn thú cưng, bác sĩ và thời gian. Bạn sẽ nhận email xác nhận.
          </DialogDescription>
        </DialogHeader>

        <form
          id="book-visit-form"
          onSubmit={form.handleSubmit((values) =>
            bookMutation.mutate({
              data: {
                petId: values.petId,
                vetId: values.vetId,
                scheduledAt: new Date(values.scheduledAt).toISOString(),
                reason: values.reason || undefined,
              },
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="petId">Thú cưng</Label>
            <Select
              disabled={petsQuery.isLoading}
              value={form.watch('petId')?.toString() ?? ''}
              onValueChange={(v) => form.setValue('petId', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger id="petId">
                <SelectValue placeholder={petsQuery.isLoading ? 'Đang tải…' : 'Chọn thú cưng'} />
              </SelectTrigger>
              <SelectContent>
                {petsQuery.data?.content?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    #{p.id} — {p.name} ({p.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.petId ? (
              <p className="text-sm text-destructive">{form.formState.errors.petId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vetId">Bác sĩ</Label>
            <Select
              disabled={vetsQuery.isLoading}
              value={form.watch('vetId')?.toString() ?? ''}
              onValueChange={(v) => form.setValue('vetId', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger id="vetId">
                <SelectValue placeholder={vetsQuery.isLoading ? 'Đang tải…' : 'Chọn bác sĩ'} />
              </SelectTrigger>
              <SelectContent>
                {vetsQuery.data?.content?.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.firstName} {v.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.vetId ? (
              <p className="text-sm text-destructive">{form.formState.errors.vetId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Thời gian khám</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              {...form.register('scheduledAt')}
            />
            {form.formState.errors.scheduledAt ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.scheduledAt.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Lý do (tuỳ chọn)</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Triệu chứng, mục đích khám..."
              {...form.register('reason')}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="book-visit-form" disabled={bookMutation.isPending}>
            {bookMutation.isPending ? 'Đang đặt…' : 'Đặt lịch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
