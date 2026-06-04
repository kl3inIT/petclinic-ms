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

import { type ProductResponse, useDeleteProduct } from '@/features/products/api';

interface Props {
  product: ProductResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProductDialog({ product, onOpenChange }: Props) {
  const deleteMutation = useDeleteProduct();

  return (
    <AlertDialog open={!!product} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá sản phẩm khỏi catalog?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{product?.name}</strong> (<code>{product?.code}</code>) sẽ bị xoá khỏi
            catalog. Đơn thuốc / hoá đơn cũ đã tham chiếu không bị ảnh hưởng. Cân nhắc đặt
            <em> ngừng kinh doanh</em> thay vì xoá để giữ lịch sử.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (product?.id == null) return;
              deleteMutation.mutate(
                { id: product.id },
                {
                  onSuccess: () => {
                    toast.success('Đã xoá sản phẩm');
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
