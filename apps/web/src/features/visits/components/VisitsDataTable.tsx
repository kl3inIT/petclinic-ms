import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Play, CheckCircle2, XCircle, Pill, Phone } from 'lucide-react';
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
import { avatarColor, initials, petMetaLine } from '../labels';
import { cn } from '@/lib/utils';

interface Props {
  data: VisitResponse[];
  isLoading?: boolean;
  onStart?: (id: number) => void;
  onComplete?: (visit: VisitResponse) => void;
  onCancel?: (id: number) => void;
  onPrescribe?: (visit: VisitResponse) => void;
}

const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function VisitsDataTable({
  data,
  isLoading,
  onStart,
  onComplete,
  onCancel,
  onPrescribe,
}: Props) {
  const [actionRowId, setActionRowId] = useState<number | null>(null);

  const columns = useMemo<ColumnDef<VisitResponse>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.id ?? '?'}</span>
        ),
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Thời gian',
        cell: ({ row }) => {
          const iso = row.original.scheduledAt;
          if (!iso) return <span className="text-muted-foreground">—</span>;
          const d = new Date(iso);
          return (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{timeFmt.format(d)}</span>
              <span className="text-xs text-muted-foreground">{dayFmt.format(d)}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'petName',
        header: 'Thú cưng',
        cell: ({ row }) => {
          const { petName, petId, petBreed, petBirthDate } = row.original;
          const display = petName ?? `#${petId ?? '?'}`;
          const meta = petMetaLine(petBreed, petBirthDate);
          return (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  avatarColor(petName),
                )}
              >
                {initials(petName)}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-medium">{display}</span>
                {meta ? (
                  <span className="text-xs text-muted-foreground">{meta}</span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'ownerName',
        header: 'Chủ nuôi',
        cell: ({ row }) => {
          const { ownerName, ownerPhone } = row.original;
          if (!ownerName && !ownerPhone) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-col leading-tight">
              <span>{ownerName ?? '—'}</span>
              {ownerPhone ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  {ownerPhone}
                </span>
              ) : null}
            </div>
          );
        },
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
          const canPrescribe =
            v.status === VisitResponseStatus.IN_PROGRESS ||
            v.status === VisitResponseStatus.COMPLETED;
          const canCancel =
            v.status === VisitResponseStatus.SCHEDULED ||
            v.status === VisitResponseStatus.IN_PROGRESS;
          const isOpen = actionRowId === id;
          return (
            <DropdownMenu
              open={isOpen}
              onOpenChange={(o) => setActionRowId(o ? id : null)}
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
                {onStart ? (
                  <DropdownMenuItem disabled={!canStart} onSelect={() => onStart(id)}>
                    <Play className="size-4" /> Bắt đầu khám
                  </DropdownMenuItem>
                ) : null}
                {onComplete ? (
                  <DropdownMenuItem
                    disabled={!canComplete}
                    onSelect={() => onComplete(v)}
                  >
                    <CheckCircle2 className="size-4" /> Hoàn thành &amp; lập hoá đơn
                  </DropdownMenuItem>
                ) : null}
                {onPrescribe ? (
                  <DropdownMenuItem
                    disabled={!canPrescribe}
                    onSelect={() => onPrescribe(v)}
                  >
                    <Pill className="size-4" /> Kê đơn thuốc
                  </DropdownMenuItem>
                ) : null}
                {onCancel ? (
                  <DropdownMenuItem
                    disabled={!canCancel}
                    variant="destructive"
                    onSelect={() => onCancel(id)}
                  >
                    <XCircle className="size-4" /> Hủy lịch
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [actionRowId, onStart, onComplete, onCancel, onPrescribe],
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
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
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
