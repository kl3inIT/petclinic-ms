import { useForm } from '@tanstack/react-form';
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
import { FieldError } from '@/lib/form/FieldError';

import { useBookVisit } from '@/lib/api/generated/visits/visits';
import { useListPets } from '@/lib/api/generated/pets/pets';
import { useListVets } from '@/lib/api/generated/vets/vets';
import { bookVisitSchema } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookVisitDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const petsQuery = useListPets({ pageable: { page: 0, size: 200, sort: ['name,asc'] } });
  const vetsQuery = useListVets({ pageable: { page: 0, size: 200, sort: ['lastName,asc'] } });

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
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="petId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Thú cưng</Label>
                <Select
                  disabled={petsQuery.isLoading}
                  value={field.state.value > 0 ? String(field.state.value) : ''}
                  onValueChange={(v) => field.handleChange(Number(v))}
                >
                  <SelectTrigger id={field.name} onBlur={field.handleBlur}>
                    <SelectValue
                      placeholder={petsQuery.isLoading ? 'Đang tải…' : 'Chọn thú cưng'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {petsQuery.data?.content?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        #{p.id} — {p.name} ({p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="vetId"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Bác sĩ</Label>
                <Select
                  disabled={vetsQuery.isLoading}
                  value={field.state.value > 0 ? String(field.state.value) : ''}
                  onValueChange={(v) => field.handleChange(Number(v))}
                >
                  <SelectTrigger id={field.name} onBlur={field.handleBlur}>
                    <SelectValue
                      placeholder={vetsQuery.isLoading ? 'Đang tải…' : 'Chọn bác sĩ'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vetsQuery.data?.content?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.firstName} {v.lastName}
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
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="reason"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Lý do (tuỳ chọn)</Label>
                <Textarea
                  id={field.name}
                  rows={3}
                  placeholder="Triệu chứng, mục đích khám..."
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
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
