import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/lib/form/FieldError';

import {
  getGetVetRatingsSummaryQueryKey,
  getListVetRatingsQueryKey,
  useAddVetRating,
} from '@/lib/api/generated/vet-ratings/vet-ratings';
import { cn } from '@/lib/utils';
import { ratingSchema } from '../schemas';

interface Props {
  vetId: number | null;
  vetLabel?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Customer rate vet sau visit COMPLETED.
 *
 * BE Phase F.1 — UPSERT semantic: cùng customer + cùng vet POST trùng → update
 * điểm cũ, KHÔNG tạo bản ghi mới. customerName lấy từ JWT (Phase F).
 * FE chỉ cần gọi mutation; không cần check existed.
 */
export function RateVetDialog({ vetId, vetLabel, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [score, setScore] = useState<number>(5);
  const [hovered, setHovered] = useState<number | null>(null);

  const addMutation = useAddVetRating({
    mutation: {
      onSuccess: () => {
        toast.success('Cảm ơn bạn đã đánh giá!');
        if (vetId) {
          void qc.invalidateQueries({ queryKey: getListVetRatingsQueryKey(vetId) });
          void qc.invalidateQueries({ queryKey: getGetVetRatingsSummaryQueryKey(vetId) });
        }
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Gửi đánh giá thất bại'),
    },
  });

  const form = useForm({
    defaultValues: { description: '' },
    validators: { onChange: ratingSchema.omit({ score: true }) },
    onSubmit: ({ value }) => {
      if (!vetId) return;
      addMutation.mutate({
        vetId,
        data: {
          score,
          description: value.description || undefined,
        },
      });
    },
  });

  useEffect(() => {
    if (vetId !== null) {
      setScore(5);
      setHovered(null);
      form.reset();
    }
    // form reference stable across renders — keep deps minimal to avoid resetting on rerender
  }, [vetId, form]);

  const display = hovered ?? score;

  return (
    <Dialog open={vetId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đánh giá bác sĩ</DialogTitle>
          <DialogDescription>
            {vetLabel
              ? `Bạn cảm thấy thế nào về ${vetLabel}?`
              : 'Bạn cảm thấy thế nào về buổi khám?'}
            <br />
            <span className="text-xs">
              Bạn có thể gửi lại đánh giá bất cứ lúc nào — điểm mới sẽ ghi đè điểm cũ.
            </span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Số sao *</Label>
            <div
              className="flex items-center gap-1"
              onMouseLeave={() => setHovered(null)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHovered(n)}
                  onClick={() => setScore(n)}
                  aria-label={`${n} sao`}
                >
                  <Star
                    className={cn(
                      'size-8 transition-colors',
                      n <= display
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30',
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{display}/5</span>
            </div>
          </div>

          <form.Field
            name="description"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Nhận xét (tuỳ chọn)</Label>
                <Textarea
                  id={field.name}
                  rows={4}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Bác sĩ rất tận tâm, chu đáo..."
                />
                <FieldError field={field} />
              </div>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              Gửi đánh giá
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
