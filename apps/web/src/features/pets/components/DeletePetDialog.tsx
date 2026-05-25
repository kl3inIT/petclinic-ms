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

import { useRemovePet } from '@/lib/api/generated/owners/owners';
import type { PetDto } from '@/lib/api/generated/model/petDto';

interface Props {
  ownerId: number;
  pet: PetDto | null;
  onOpenChange: (open: boolean) => void;
}

export function DeletePetDialog({ ownerId, pet, onOpenChange }: Props) {
  const qc = useQueryClient();
  const open = pet !== null;

  const removeMutation = useRemovePet({
    mutation: {
      onSuccess: () => {
        toast.success('Đã xóa thú cưng');
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
          <AlertDialogTitle>Xóa thú cưng "{pet?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Visits đã book cho pet này sẽ giữ nguyên với
            petId mồ côi — nên xem trước khi xóa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeMutation.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={removeMutation.isPending || pet?.id === undefined}
            onClick={(e) => {
              e.preventDefault();
              if (pet?.id !== undefined) {
                removeMutation.mutate({ id: ownerId, petId: pet.id });
              }
            }}
          >
            {removeMutation.isPending ? 'Đang xóa…' : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
