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

import { useRemoveMyPet } from '@/lib/api/generated/owners/owners';
import type { PetDto } from '@/lib/api/generated/model/petDto';

interface Props {
  /** null = đóng; PetDto = đang xác nhận xóa bé này. */
  pet: PetDto | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Xác nhận xóa thú cưng của chủ nuôi (self-service `/api/v1/owners/me/pets/{petId}`).
 * Dùng AlertDialog thay window.confirm — đúng pattern design-system.
 */
export function MyPetDeleteDialog({ pet, onOpenChange }: Props) {
  const qc = useQueryClient();
  const open = pet !== null;

  const removeMutation = useRemoveMyPet({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa hồ sơ thú cưng');
        void qc.invalidateQueries({
          predicate: (q) => {
            const first = q.queryKey[0];
            return (
              typeof first === 'string' &&
              (first.startsWith('/api/v1/owners') || first.startsWith('/api/v1/pets'))
            );
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
          <AlertDialogTitle>Xóa hồ sơ "{pet?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Lịch khám đã đặt cho bé vẫn được giữ lại
            trong lịch sử.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeMutation.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={removeMutation.isPending || pet?.id === undefined}
            onClick={(e) => {
              e.preventDefault();
              if (pet?.id != null) removeMutation.mutate({ petId: pet.id });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removeMutation.isPending ? 'Đang xóa…' : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
