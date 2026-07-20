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
          <AlertDialogTitle>Ngừng kinh doanh sản phẩm?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{product?.name}</strong> (<code>{product?.code}</code>) sẽ được ẩn
            khỏi catalog và không thể nhập/xuất kho. Dữ liệu cùng lịch sử kho vẫn được giữ
            lại.
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
                    toast.success('Đã ngừng kinh doanh sản phẩm');
                    onOpenChange(false);
                  },
                  onError: (err) =>
                    toast.error((err as Error).message || 'Cập nhật thất bại'),
                },
              );
            }}
          >
            Ngừng kinh doanh
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
