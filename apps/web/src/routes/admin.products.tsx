import { useMemo, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Package, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/features/auth/store';
import { type ProductResponse, useProducts } from '@/features/products/api';
import { formatVnd } from '@/features/billing/format';
import {
  PRODUCT_TYPE_CLASS,
  PRODUCT_TYPE_LABEL,
  STOCK_STATUS_CLASS,
  STOCK_STATUS_LABEL,
} from '@/features/products/labels';
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog';
import { DeleteProductDialog } from '@/features/products/components/DeleteProductDialog';
import { RestockDialog } from '@/features/products/components/RestockDialog';

export const Route = createFileRoute('/admin/products')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user;
    if (!user?.roles.includes('ADMIN')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/admin' });
    }
  },
  component: ProductsAdminPage,
});

function ProductsAdminPage() {
  const listQuery = useProducts({ pageable: { page: 0, size: 200, sort: ['code,asc'] } });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [deleting, setDeleting] = useState<ProductResponse | null>(null);
  const [restocking, setRestocking] = useState<ProductResponse | null>(null);
  const [actionRowId, setActionRowId] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<ProductResponse>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.original.code}
          </Badge>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Tên',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ row }) => {
          const t = row.original.type;
          return t ? (
            <Badge className={PRODUCT_TYPE_CLASS[t] + ' hover:opacity-100'}>
              {PRODUCT_TYPE_LABEL[t]}
            </Badge>
          ) : null;
        },
      },
      {
        accessorKey: 'unitPrice',
        header: 'Đơn giá',
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {formatVnd(row.original.unitPrice)}
            {row.original.unit ? (
              <span className="text-muted-foreground">/{row.original.unit}</span>
            ) : null}
          </span>
        ),
      },
      {
        id: 'stock',
        header: 'Tồn kho',
        cell: ({ row }) => {
          const p = row.original;
          if (!p.stockTracked) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{p.stockQuantity ?? 0}</span>
              {p.stockStatus ? (
                <Badge
                  className={STOCK_STATUS_CLASS[p.stockStatus] + ' hover:opacity-100'}
                >
                  {STOCK_STATUS_LABEL[p.stockStatus]}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'active',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.active ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Kinh doanh
            </Badge>
          ) : (
            <Badge variant="secondary">Ẩn</Badge>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Hành động</span>,
        cell: ({ row }) => {
          const p = row.original;
          const isOpen = actionRowId === p.id;
          return (
            <DropdownMenu
              open={isOpen}
              onOpenChange={(o) => setActionRowId(o ? (p.id ?? null) : null)}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setEditing(p)}>
                  <Pencil className="size-4" /> Sửa
                </DropdownMenuItem>
                {p.stockTracked ? (
                  <DropdownMenuItem onSelect={() => setRestocking(p)}>
                    <PackagePlus className="size-4" /> Nhập kho
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(p)}>
                  <Trash2 className="size-4" /> Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [actionRowId],
  );

  const table = useReactTable({
    data: listQuery.data?.content ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Danh mục sản phẩm</h1>
            <p className="text-sm text-muted-foreground">
              Thuốc, dịch vụ khám, vật tư + tồn kho. Vet chọn khi kê đơn / hoàn tất khám.
              Admin only.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Thêm sản phẩm
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Danh sách</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      {columns.map((_c, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Chưa có sản phẩm nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProductFormDialog
        key={editing?.id ?? 'edit'}
        open={!!editing}
        product={editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <RestockDialog
        product={restocking}
        onOpenChange={(o) => !o && setRestocking(null)}
      />
      <DeleteProductDialog
        product={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      />
    </div>
  );
}
