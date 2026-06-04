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

import { type DiseaseResponse, useDeleteDisease } from '@/features/billing/api';

interface Props {
  disease: DiseaseResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDiseaseDialog({ disease, onOpenChange }: Props) {
  const deleteMutation = useDeleteDisease();

  return (
    <AlertDialog open={!!disease} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá bệnh khỏi danh mục?</AlertDialogTitle>
          <AlertDialogDescription>
            Bệnh <strong>{disease?.name}</strong> (<code>{disease?.code}</code>) sẽ bị xoá
            khỏi danh mục. Hoá đơn cũ đã tham chiếu không bị ảnh hưởng.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (disease?.id == null) return;
              deleteMutation.mutate(
                { id: disease.id },
                {
                  onSuccess: () => {
                    toast.success('Đã xoá bệnh');
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error((err as Error).message || 'Xoá thất bại'),
                },
              );
            }}
          >
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
