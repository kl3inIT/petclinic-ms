import { useEffect } from 'react';
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

import { useCompleteVisit } from '@/lib/api/generated/visits/visits';
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { completeVisitSchema, type CompleteVisitInput } from '../schemas';

interface Props {
  visit: VisitResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function CompleteVisitDialog({ visit, onOpenChange }: Props) {
  const qc = useQueryClient();
  const open = visit !== null;

  const form = useForm<CompleteVisitInput>({
    resolver: zodResolver(completeVisitSchema),
    defaultValues: { diagnosis: '', treatment: '', fee: 0 },
  });

  useEffect(() => {
    if (visit) {
      form.reset({
        diagnosis: visit.diagnosis ?? '',
        treatment: visit.treatment ?? '',
        fee: visit.fee ?? 0,
      });
    }
  }, [visit, form]);

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

  if (!visit?.id) return null;
  const visitId = visit.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hoàn thành visit #{visitId}</DialogTitle>
          <DialogDescription>
            Ghi chẩn đoán + phác đồ điều trị + chi phí. Email tóm tắt sẽ gửi cho khách.
          </DialogDescription>
        </DialogHeader>

        <form
          id="complete-visit-form"
          onSubmit={form.handleSubmit((values) =>
            completeMutation.mutate({
              id: visitId,
              data: {
                diagnosis: values.diagnosis,
                treatment: values.treatment || undefined,
                fee: values.fee,
              },
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Chẩn đoán *</Label>
            <Textarea
              id="diagnosis"
              rows={2}
              placeholder="Vd: viêm da cơ địa..."
              {...form.register('diagnosis')}
            />
            {form.formState.errors.diagnosis ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.diagnosis.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment">Điều trị</Label>
            <Textarea
              id="treatment"
              rows={2}
              placeholder="Vd: kháng sinh 7 ngày, kem bôi..."
              {...form.register('treatment')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee">Chi phí (VND)</Label>
            <Input
              id="fee"
              type="number"
              min={0}
              step="1000"
              {...form.register('fee', { valueAsNumber: true })}
            />
            {form.formState.errors.fee ? (
              <p className="text-sm text-destructive">{form.formState.errors.fee.message}</p>
            ) : null}
          </div>
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
