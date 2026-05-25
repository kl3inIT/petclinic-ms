import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/lib/form/FieldError';

import {
  getListVetBadgesQueryKey,
  useAddVetBadge,
  useDeleteVetBadge,
  useListVetBadges,
} from '@/lib/api/generated/vet-badges/vet-badges';
import { BadgeRequestTitle, type BadgeResponse } from '@/lib/api/generated/model';
import { BADGE_TITLE_LABEL } from '../labels';
import { badgeSchema } from '../schemas';

interface Props {
  vetId: number;
}

export function VetBadgesTab({ vetId }: Props) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<BadgeResponse | null>(null);

  const listQuery = useListVetBadges(vetId, {
    pageable: { page: 0, size: 50, sort: ['awardedDate,desc'] },
  });

  function invalidate() {
    void qc.invalidateQueries({ queryKey: getListVetBadgesQueryKey(vetId) });
  }

  const addMutation = useAddVetBadge({
    mutation: {
      onSuccess: () => {
        toast.success('Đã trao huy hiệu');
        invalidate();
        setAddOpen(false);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const deleteMutation = useDeleteVetBadge({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa huy hiệu');
        invalidate();
        setDeleting(null);
      },
      onError: (e: Error) => toast.error(e.message || 'Lỗi'),
    },
  });

  const [title, setTitle] = useState<BadgeRequestTitle>(BadgeRequestTitle.ROOKIE);

  const form = useForm({
    defaultValues: {
      awardedDate: '',
      description: '',
    },
    validators: { onChange: badgeSchema.omit({ title: true }) },
    onSubmit: ({ value }) =>
      addMutation.mutate({
        vetId,
        data: {
          title,
          awardedDate: value.awardedDate,
          description: value.description || undefined,
        },
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Huy hiệu / thành tích</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Trao huy hiệu
        </Button>
      </div>

      {listQuery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (listQuery.data?.content ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Award className="size-5" />
            Chưa có huy hiệu nào
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {listQuery.data?.content?.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-yellow-500" />
                    <Badge variant="secondary">
                      {b.title ? BADGE_TITLE_LABEL[b.title] : b.title}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Trao ngày: {b.awardedDate}
                  </p>
                  {b.description && (
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setDeleting(b)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) form.reset();
          setAddOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trao huy hiệu</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="badge-title">Loại huy hiệu *</Label>
              <Select
                value={title}
                onValueChange={(v) => setTitle(v as BadgeRequestTitle)}
              >
                <SelectTrigger id="badge-title">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BadgeRequestTitle).map((t) => (
                    <SelectItem key={t} value={t}>
                      {BADGE_TITLE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <form.Field
              name="awardedDate"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Ngày trao *</Label>
                  <Input
                    id={field.name}
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="description"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Mô tả</Label>
                  <Textarea
                    id={field.name}
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa huy hiệu</AlertDialogTitle>
            <AlertDialogDescription>
              Huy hiệu sẽ bị xóa khỏi hồ sơ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting?.id == null) return;
                deleteMutation.mutate({ vetId, badgeId: deleting.id });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
