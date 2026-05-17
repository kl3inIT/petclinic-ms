import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Play, CheckCircle2, XCircle } from 'lucide-react';
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
import type { VisitResponse } from '@/lib/api/generated/model/visitResponse';
import { VisitResponseStatus } from '@/lib/api/generated/model/visitResponseStatus';
import { VisitStatusBadge } from './VisitStatusBadge';

interface Props {
  data: VisitResponse[];
  isLoading?: boolean;
  onStart: (id: number) => void;
  onComplete: (visit: VisitResponse) => void;
  onCancel: (id: number) => void;
}

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function fmtDate(iso?: string): string {
  return iso ? dateFmt.format(new Date(iso)) : '—';
}

export function VisitsDataTable({ data, isLoading, onStart, onComplete, onCancel }: Props) {
  const [actionRowId, setActionRowId] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<VisitResponse>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id ?? '?'}</span>,
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Thời gian',
        cell: ({ row }) => fmtDate(row.original.scheduledAt),
      },
      {
        accessorKey: 'petId',
        header: 'Pet',
        cell: ({ row }) => `#${row.original.petId ?? '?'}`,
      },
      {
        accessorKey: 'vetId',
        header: 'Vet',
        cell: ({ row }) => `#${row.original.vetId ?? '?'}`,
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.status ? <VisitStatusBadge status={row.original.status} /> : '—',
      },
      {
        accessorKey: 'reason',
        header: 'Lý do',
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-[240px] text-muted-foreground">
            {row.original.reason ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Hành động</span>,
        cell: ({ row }) => {
          const v = row.original;
          const id = v.id;
          if (id === undefined) return null;
          const canStart = v.status === VisitResponseStatus.SCHEDULED;
          const canComplete = v.status === VisitResponseStatus.IN_PROGRESS;
          const canCancel =
            v.status === VisitResponseStatus.SCHEDULED ||
            v.status === VisitResponseStatus.IN_PROGRESS;
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
                <DropdownMenuItem disabled={!canStart} onSelect={() => onStart(id)}>
                  <Play className="size-4" /> Bắt đầu khám
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canComplete} onSelect={() => onComplete(v)}>
                  <CheckCircle2 className="size-4" /> Hoàn thành
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canCancel}
                  variant="destructive"
                  onSelect={() => onCancel(id)}
                >
                  <XCircle className="size-4" /> Hủy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [actionRowId, onStart, onComplete, onCancel],
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
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Chưa có lịch khám nào.
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
