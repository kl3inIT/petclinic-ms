import { useEffect } from 'react';
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
import { FieldError } from '@/lib/form/FieldError';

import { useCompleteVisit } from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { completeVisitSchema } from '../schemas';

interface Props {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function CompleteVisitDialog({ visit, onOpenChange }: Props) {
  const qc = useQueryClient();
  const open = visit !== null;

  const completeMutation = useCompleteVisit({
    mutation: {
      onSuccess: () => {
        toast.success('Đã hoàn thành buổi khám');
        void qc.invalidateQueries({ queryKey: ['/api/v1/visits'] });
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Lỗi'),
    },
  });

  const visitId = visit?.id;

  const form = useForm({
    defaultValues: {
      diagnosis: '',
      treatment: '',
      fee: 0,
    },
    validators: { onChange: completeVisitSchema },
    onSubmit: ({ value }) => {
      if (visitId === undefined) return;
      completeMutation.mutate({
        id: visitId,
        data: {
          diagnosis: value.diagnosis,
          treatment: value.treatment || undefined,
          fee: value.fee,
        },
      });
    },
  });

  // Prefill khi dialog mở với visit hiện tại — reset thay vì set từng field tránh
  // "uncontrolled → controlled" warning lúc visit chuyển từ null sang object.
  useEffect(() => {
    if (visit) {
      form.reset({
        diagnosis: visit.diagnosis ?? '',
        treatment: visit.treatment ?? '',
        fee: visit.fee ?? 0,
      });
    }
  }, [visit, form]);

  if (!visit?.id) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hoàn thành visit #{visit.id}</DialogTitle>
          <DialogDescription>
            Ghi chẩn đoán + phác đồ điều trị + chi phí. Email tóm tắt sẽ gửi cho khách.
          </DialogDescription>
        </DialogHeader>

        <form
          id="complete-visit-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="diagnosis"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Chẩn đoán *</Label>
                <Textarea
                  id={field.name}
                  rows={2}
                  placeholder="Vd: viêm da cơ địa..."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="treatment"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Điều trị</Label>
                <Textarea
                  id={field.name}
                  rows={2}
                  placeholder="Vd: kháng sinh 7 ngày, kem bôi..."
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <form.Field
            name="fee"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Chi phí (VND)</Label>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  step="1000"
                  value={field.state.value ?? 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
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
          <Button
            type="submit"
            form="complete-visit-form"
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? 'Đang lưu…' : 'Hoàn thành'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
