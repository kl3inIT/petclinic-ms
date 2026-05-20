import { useQueryClient } from '@tanstack/react-query';
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

import { useDeleteOwner } from '@/lib/api/generated/owners/owners';
import type { OwnerResponse } from '@/lib/api/generated/model/ownerResponse';

interface Props {
  owner: OwnerResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteOwnerDialog({ owner, onOpenChange }: Props) {
  const qc = useQueryClient();
  const open = owner !== null;

  const deleteMutation = useDeleteOwner({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa chủ nuôi');
        void qc.invalidateQueries({
          predicate: (q) => {
            const first = q.queryKey[0];
            return typeof first === 'string' && first.startsWith('/api/v1/owners');
          },
        });
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Xóa thất bại'),
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa chủ nuôi #{owner?.id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Toàn bộ thú cưng liên kết cũng sẽ bị xóa
            theo cascade ở DB. Visits đã tạo sẽ giữ nguyên (giá trị petId/vetId mồ côi).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending || owner?.id === undefined}
            onClick={(e) => {
              e.preventDefault();
              if (owner?.id !== undefined) deleteMutation.mutate({ id: owner.id });
            }}
          >
            {deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
