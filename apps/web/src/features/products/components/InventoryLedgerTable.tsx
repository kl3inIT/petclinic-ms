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
import { formatDateTime } from '@/features/billing/format';
import type { StockMovement } from '@/features/products/inventory-api';

interface Props {
  movements: StockMovement[];
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
}

const OPERATION_LABEL: Record<NonNullable<StockMovement['operationType']>, string> = {
  INITIAL: 'Đầu kỳ',
  CONSUME: 'Xuất',
  RESTOCK: 'Nhập',
  ADJUSTMENT: 'Điều chỉnh',
};

export function InventoryLedgerTable({
  movements,
  isLoading,
  isError,
  emptyMessage = 'Chưa có giao dịch kho.',
}: Props) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian</TableHead>
            <TableHead>Chứng từ</TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead className="text-right">Nhập</TableHead>
            <TableHead className="text-right">Xuất</TableHead>
            <TableHead className="text-right">Tồn sau</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead>Người ghi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, row) => (
              <TableRow key={row}>
                {Array.from({ length: 8 }).map((__, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-destructive">
                Không tải được sổ cái kho.
              </TableCell>
            </TableRow>
          ) : movements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            movements.map((movement) => {
              const delta = movement.quantityDelta ?? 0;
              return (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(movement.createdDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {movement.operationType
                          ? OPERATION_LABEL[movement.operationType]
                          : '—'}
                      </Badge>
                      <span className="max-w-32 truncate font-mono text-xs text-muted-foreground">
                        {movement.sourceId ?? '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {movement.productCode ?? `#${movement.productId ?? '—'}`}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-600">
                    {delta > 0 ? delta : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-rose-600">
                    {delta < 0 ? Math.abs(delta) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {movement.quantityAfter ?? 0}
                  </TableCell>
                  <TableCell className="max-w-64 truncate" title={movement.reason}>
                    {movement.reason ?? '—'}
                  </TableCell>
                  <TableCell>{movement.createdBy ?? 'system'}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
