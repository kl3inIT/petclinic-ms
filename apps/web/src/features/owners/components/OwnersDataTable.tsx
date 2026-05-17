import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Trash2, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { OwnerResponse } from '@/lib/api/generated/model/ownerResponse';

interface Props {
  data: OwnerResponse[];
  isLoading?: boolean;
  onView: (owner: OwnerResponse) => void;
  onDelete: (owner: OwnerResponse) => void;
}

export function OwnersDataTable({ data, isLoading, onView, onDelete }: Props) {
  const [actionRowId, setActionRowId] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<OwnerResponse>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.id ?? '?'}</span>
        ),
      },
      {
        id: 'name',
        header: 'Họ tên',
        cell: ({ row }) => {
          const { firstName, lastName } = row.original;
          return (
            <span className="font-medium">
              {firstName ?? ''} {lastName ?? ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'city',
        header: 'Thành phố',
        cell: ({ row }) => row.original.city ?? '—',
      },
      {
        accessorKey: 'telephone',
        header: 'Điện thoại',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.telephone ?? '—'}</span>
        ),
      },
      {
        id: 'pets',
        header: 'Pets',
        cell: ({ row }) => {
          const count = row.original.pets?.length ?? 0;
          return <Badge variant="secondary">{count}</Badge>;
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Hành động</span>,
        cell: ({ row }) => {
          const owner = row.original;
          const id = owner.id;
          if (id === undefined) return null;
          const isOpen = actionRowId === id;
          return (
            <DropdownMenu open={isOpen} onOpenChange={(o) => setActionRowId(o ? id : null)}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onView(owner)}>
                  <Eye className="size-4" /> Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(owner)}>
                  <Trash2 className="size-4" /> Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [actionRowId, onView, onDelete],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
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
                Chưa có chủ nuôi nào.
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
  );
}
