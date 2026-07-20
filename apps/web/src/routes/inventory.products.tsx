import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { z } from 'zod';

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
import { Input } from '@/components/ui/input';
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
import { InventoryHistoryDialog } from '@/features/products/components/InventoryHistoryDialog';
import { InventoryLedgerTable } from '@/features/products/components/InventoryLedgerTable';
import { StockMovementDialog } from '@/features/products/components/StockMovementDialog';
import {
  type StockMovementDirection,
  useInventoryMovements,
} from '@/features/products/inventory-api';

const productSearchSchema = z.object({
  type: z
    .enum(['MEDICATION', 'VACCINE', 'SERVICE', 'SUPPLY', 'MERCHANDISE'])
    .optional()
    .catch(undefined),
  lowStock: z.boolean().optional().catch(undefined),
  view: z.enum(['ledger']).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  action: z.enum(['in', 'out']).optional().catch(undefined),
});

export const Route = createFileRoute('/inventory/products')({
  validateSearch: productSearchSchema,
  beforeLoad: () => {
    const user = useAuthStore.getState().user;
    const roles = user?.roles ?? [];
    if (!roles.includes('ADMIN') && !roles.includes('INVENTORY_MANAGER')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/inventory' });
    }
  },
  component: ProductsAdminPage,
});

function ProductsAdminPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const listQuery = useProducts({
    q: search.q,
    type: search.type,
    lowStock: search.lowStock,
    pageable: { page: 0, size: 500, sort: ['code,asc'] },
  });
  const allProductsQuery = useProducts({
    active: true,
    pageable: { page: 0, size: 500, sort: ['code,asc'] },
  });
  const [ledgerPage, setLedgerPage] = useState(0);
  const ledgerQuery = useInventoryMovements(50, search.view === 'ledger', ledgerPage);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [deleting, setDeleting] = useState<ProductResponse | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductResponse | null>(null);
  const [actionRowId, setActionRowId] = useState<number | null>(null);
  const [query, setQuery] = useState(search.q ?? '');
  const [movement, setMovement] = useState<{
    direction: StockMovementDirection;
    product: ProductResponse | null;
  } | null>(null);

  useEffect(() => setQuery(search.q ?? ''), [search.q]);
  useEffect(() => {
    if (!search.action) return;
    setMovement(
      (current) =>
        current ?? {
          direction: search.action === 'in' ? 'IN' : 'OUT',
          product: null,
        },
    );
  }, [search.action]);

  const closeMovement = () => {
    setMovement(null);
    if (search.action) {
      void navigate({
        replace: true,
        search: (current) => ({ ...current, action: undefined }),
      });
    }
  };

  const page = pageMetadata(search);

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
                  <>
                    <DropdownMenuItem
                      onSelect={() => setMovement({ direction: 'IN', product: p })}
                    >
                      <ArrowDownToLine className="size-4" /> Nhập kho
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setMovement({ direction: 'OUT', product: p })}
                    >
                      <ArrowUpFromLine className="size-4" /> Xuất kho
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setHistoryProduct(p)}>
                      <History className="size-4" /> Lịch sử kho
                    </DropdownMenuItem>
                  </>
                ) : null}
                {p.active ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(p)}>
                    <Trash2 className="size-4" /> Ngừng kinh doanh
                  </DropdownMenuItem>
                ) : null}
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
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <Package className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">{page.title}</h1>
            <p className="text-sm text-muted-foreground">{page.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setMovement({ direction: 'IN', product: null })}
          >
            <ArrowDownToLine /> Nhập kho
          </Button>
          <Button
            variant="outline"
            onClick={() => setMovement({ direction: 'OUT', product: null })}
          >
            <ArrowUpFromLine /> Xuất kho
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Thêm sản phẩm
          </Button>
        </div>
      </div>

      {search.view === 'ledger' ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sổ cái Nhập – Xuất – Tồn</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryLedgerTable
              movements={ledgerQuery.data?.content ?? []}
              isLoading={ledgerQuery.isLoading}
              isError={ledgerQuery.isError}
            />
            {(ledgerQuery.data?.totalPages ?? 0) > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Trang {(ledgerQuery.data?.number ?? ledgerPage) + 1}/
                  {ledgerQuery.data?.totalPages} · {ledgerQuery.data?.totalElements ?? 0}{' '}
                  giao dịch
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ledgerPage === 0 || ledgerQuery.isFetching}
                    onClick={() => setLedgerPage((current) => Math.max(0, current - 1))}
                  >
                    Trang trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      ledgerPage + 1 >= (ledgerQuery.data?.totalPages ?? 0) ||
                      ledgerQuery.isFetching
                    }
                    onClick={() => setLedgerPage((current) => current + 1)}
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-4 pb-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">{page.listTitle}</CardTitle>
            <form
              className="relative w-full md:w-80"
              onSubmit={(event) => {
                event.preventDefault();
                void navigate({
                  search: (current) => ({
                    ...current,
                    q: query.trim() || undefined,
                  }),
                });
              }}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo mã hoặc tên…"
                aria-label="Tìm sản phẩm"
                className="pl-9"
              />
            </form>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border bg-card">
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
                  ) : listQuery.isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-destructive"
                      >
                        Không tải được danh sách sản phẩm.
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {search.lowStock
                          ? 'Không có mặt hàng sắp hết.'
                          : 'Không tìm thấy sản phẩm phù hợp.'}
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
      )}

      <ProductFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProductFormDialog
        key={editing?.id ?? 'edit'}
        open={!!editing}
        product={editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <DeleteProductDialog
        product={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      />
      <InventoryHistoryDialog
        product={historyProduct}
        onOpenChange={(open) => !open && setHistoryProduct(null)}
      />
      <StockMovementDialog
        open={movement != null}
        direction={movement?.direction ?? 'IN'}
        products={allProductsQuery.data?.content ?? []}
        product={movement?.product}
        onOpenChange={(open) => !open && closeMovement()}
      />
    </div>
  );
}

function pageMetadata(search: z.infer<typeof productSearchSchema>) {
  if (search.view === 'ledger') {
    return {
      title: 'Sổ cái kho',
      description: 'Theo dõi mọi giao dịch nhập, xuất và số dư tồn sau từng nghiệp vụ.',
      listTitle: 'Biến động kho',
    };
  }
  if (search.lowStock) {
    return {
      title: 'Hàng sắp hết',
      description: 'Các mặt hàng đã chạm hoặc thấp hơn mức tái đặt hàng.',
      listTitle: 'Danh sách cần bổ sung',
    };
  }
  const byType = {
    MEDICATION: ['Thuốc', 'Quản lý thuốc dùng trong khám và điều trị.'],
    VACCINE: ['Vaccine', 'Quản lý vaccine và tồn kho phục vụ tiêm phòng.'],
    SUPPLY: ['Vật tư y tế', 'Quản lý vật tư tiêu hao phục vụ khám chữa bệnh.'],
    SERVICE: ['Dịch vụ', 'Quản lý danh mục dịch vụ và giá áp dụng.'],
    MERCHANDISE: ['Hàng bán lẻ', 'Quản lý thức ăn, phụ kiện và sản phẩm bán tại quầy.'],
  } as const;
  const selected = search.type ? byType[search.type] : undefined;
  return {
    title: selected?.[0] ?? 'Tất cả sản phẩm',
    description:
      selected?.[1] ??
      'Quản lý danh mục, tồn kho và trạng thái kinh doanh theo từng nhóm hàng.',
    listTitle: selected
      ? `Danh sách ${selected[0].toLocaleLowerCase('vi-VN')}`
      : 'Danh sách',
  };
}
