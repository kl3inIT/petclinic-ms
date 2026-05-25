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

import { type PetTypeResponse, useDeletePetType } from '@/features/pet-types/api';

interface Props {
  petType: PetTypeResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function DeletePetTypeDialog({ petType, onOpenChange }: Props) {
  const open = petType !== null;
  const deleteMutation = useDeletePetType();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa loại pet "{petType?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            BE chặn xóa nếu còn pet đang tham chiếu loại này (FK in-use). Nếu cần disable
            thay vì xóa, đặt <code>display_order</code> cao và dùng UI filter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending || petType?.id === undefined}
            onClick={(e) => {
              e.preventDefault();
              if (petType?.id !== undefined) {
                deleteMutation.mutate(petType.id, {
                  onSuccess: () => {
                    toast.success('Đã xóa loại pet');
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error((err as Error).message || 'Xóa thất bại'),
                });
              }
            }}
          >
            {deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
