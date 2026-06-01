import { useMemo, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react';

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
import { type DiseaseResponse, useDiseases } from '@/features/billing/api';
import { formatVnd } from '@/features/billing/format';
import { DiseaseFormDialog } from '@/features/billing/components/DiseaseFormDialog';
import { DeleteDiseaseDialog } from '@/features/billing/components/DeleteDiseaseDialog';

export const Route = createFileRoute('/admin/diseases')({
  beforeLoad: () => {
    // CRUD danh mục bệnh chỉ ADMIN (BE cũng enforce). STAFF gõ URL trực tiếp → về /admin.
    const user = useAuthStore.getState().user;
    if (!user?.roles.includes('ADMIN')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/admin' });
    }
  },
  component: DiseasesAdminPage,
});

function DiseasesAdminPage() {
  const listQuery = useDiseases({ pageable: { page: 0, size: 100, sort: ['code,asc'] } });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DiseaseResponse | null>(null);
  const [deleting, setDeleting] = useState<DiseaseResponse | null>(null);
  const [actionRowId, setActionRowId] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<DiseaseResponse>[]>(
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
        header: 'Tên bệnh',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Nhóm',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.category ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'baseCost',
        header: 'Chi phí',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatVnd(row.original.baseCost)}</span>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.active ? (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Áp dụng
            </Badge>
          ) : (
            <Badge variant="secondary">Ẩn</Badge>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Hành động</span>,
        cell: ({ row }) => {
          const d = row.original;
          const isOpen = actionRowId === d.id;
          return (
            <DropdownMenu
              open={isOpen}
              onOpenChange={(o) => setActionRowId(o ? (d.id ?? null) : null)}
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
                <DropdownMenuItem onSelect={() => setEditing(d)}>
                  <Pencil className="size-4" /> Sửa
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(d)}>
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
          <Stethoscope className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Danh mục bệnh</h1>
            <p className="text-sm text-muted-foreground">
              Các loại bệnh + chi phí điều trị mặc định. Dùng khi lập hoá đơn. Admin only.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Thêm bệnh
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
                  Array.from({ length: 6 }).map((_, i) => (
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
                      Chưa có bệnh nào.
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

      <DiseaseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DiseaseFormDialog
        key={editing?.id ?? 'edit'}
        open={!!editing}
        disease={editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <DeleteDiseaseDialog
        disease={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      />
    </div>
  );
}
