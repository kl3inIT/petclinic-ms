import { Link } from '@tanstack/react-router';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CircleX,
  Package,
  TriangleAlert,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatVnd } from '@/features/billing/format';
import { useProducts } from '@/features/products/api';
import { summarizeInventory } from '@/features/products/inventory-metrics';
import { useInventoryMovements } from '@/features/products/inventory-api';
import { STOCK_STATUS_CLASS, STOCK_STATUS_LABEL } from '@/features/products/labels';

export function InventoryDashboard() {
  const productsQuery = useProducts({
    active: true,
    pageable: { page: 0, size: 500, sort: ['code,asc'] },
  });
  const movementsQuery = useInventoryMovements(6);
  const products = productsQuery.data?.content ?? [];
  const summary = summarizeInventory(products);
  const lowStock = products
    .filter((product) => product.stockStatus === 'LOW' || product.stockStatus === 'OUT')
    .sort((left, right) => (left.stockQuantity ?? 0) - (right.stockQuantity ?? 0))
    .slice(0, 6);
  const recentMovements = movementsQuery.data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Tổng quan kho hàng</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi tồn kho, cảnh báo thiếu hàng và giao dịch mới nhất.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/inventory/products" search={{ action: 'in' }}>
              <ArrowDownToLine /> Nhập kho
            </Link>
          </Button>
          <Button asChild>
            <Link to="/inventory/products" search={{ action: 'out' }}>
              <ArrowUpFromLine /> Xuất kho
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Danh mục hoạt động"
          value={summary.activeCatalogItems}
          icon={Package}
          loading={productsQuery.isLoading}
        />
        <MetricCard
          title="Mặt hàng có tồn"
          value={summary.stockTrackedItems}
          icon={Boxes}
          loading={productsQuery.isLoading}
        />
        <MetricCard
          title="Sắp hết"
          value={summary.lowStockItems}
          icon={TriangleAlert}
          tone="warning"
          loading={productsQuery.isLoading}
        />
        <MetricCard
          title="Hết hàng"
          value={summary.outOfStockItems}
          icon={CircleX}
          tone="danger"
          loading={productsQuery.isLoading}
        />
        <MetricCard
          title="Giá trị tồn ước tính"
          value={formatVnd(summary.inventoryValue)}
          icon={WalletCards}
          loading={productsQuery.isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Cảnh báo tồn kho</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Các mặt hàng đã chạm mức tái đặt hàng.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/inventory/products" search={{ lowStock: true }}>
                Xem tất cả
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                  <TableHead className="text-right">Mức đặt lại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 4 }).map((__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : lowStock.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Không có mặt hàng cần cảnh báo.
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStock.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {product.code}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {product.stockQuantity ?? 0}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {product.reorderLevel ?? 0}
                      </TableCell>
                      <TableCell>
                        {product.stockStatus ? (
                          <Badge
                            className={`${STOCK_STATUS_CLASS[product.stockStatus]} hover:opacity-100`}
                          >
                            {STOCK_STATUS_LABEL[product.stockStatus]}
                          </Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Dòng mới nhất trong sổ cái kho.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/inventory/products" search={{ view: 'ledger' }}>
                Mở sổ cái
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {movementsQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))
            ) : movementsQuery.isError ? (
              <p className="py-8 text-center text-sm text-destructive">
                Không tải được giao dịch gần đây.
              </p>
            ) : recentMovements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Chưa có giao dịch kho.
              </p>
            ) : (
              recentMovements.map((movement) => {
                const delta = movement.quantityDelta ?? 0;
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {movement.productCode ?? `#${movement.productId ?? '—'}`}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {movement.reason ?? movement.sourceType ?? 'Giao dịch kho'} ·{' '}
                        {formatDateTime(movement.createdDate)}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-sm font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
  tone = 'default',
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  loading: boolean;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-rose-100 text-rose-700'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-primary/10 text-primary';

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-1 truncate text-2xl font-semibold">{value}</p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${toneClass}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
