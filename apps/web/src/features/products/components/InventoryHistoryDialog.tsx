import { formatDateTime } from '@/features/billing/format';
import { type ProductResponse } from '@/features/products/api';
import { useStockMovements } from '@/features/products/inventory-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  product: ProductResponse | null;
  onOpenChange: (open: boolean) => void;
}

const OPERATION_LABEL = {
  INITIAL: 'Số dư đầu kỳ',
  CONSUME: 'Xuất kho',
  RESTOCK: 'Nhập kho',
  ADJUSTMENT: 'Điều chỉnh',
} as const;

export function InventoryHistoryDialog({ product, onOpenChange }: Props) {
  const query = useStockMovements(product?.id);
  const movements = query.data?.content ?? [];

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Lịch sử tồn kho</DialogTitle>
          <DialogDescription>
            {product?.name} (<code>{product?.code}</code>) — sổ biến động chỉ ghi thêm.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead className="text-right">Trước</TableHead>
                <TableHead className="text-right">Thay đổi</TableHead>
                <TableHead className="text-right">Sau</TableHead>
                <TableHead>Lý do</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Không tải được lịch sử kho.
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Chưa có biến động kho.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTime(movement.createdDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {movement.operationType
                          ? OPERATION_LABEL[movement.operationType]
                          : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {movement.sourceType ?? '—'}
                      {movement.sourceId ? ` #${movement.sourceId}` : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {movement.quantityBefore ?? 0}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-semibold ${(movement.quantityDelta ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {(movement.quantityDelta ?? 0) > 0 ? '+' : ''}
                      {movement.quantityDelta ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {movement.quantityAfter ?? 0}
                    </TableCell>
                    <TableCell className="max-w-64 truncate" title={movement.reason}>
                      {movement.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
