import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
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
import type { PetResponse } from '@/lib/api/generated/model/petResponse';
import { usePetTypes } from '@/features/pet-types/api';

interface Props {
  data: PetResponse[];
  isLoading?: boolean;
}

const dateFmt = new Intl.DateTimeFormat('vi-VN');

function fmtDate(iso?: string): string {
  return iso ? dateFmt.format(new Date(iso)) : '—';
}

export function PetsDataTable({ data, isLoading }: Props) {
  const petTypesQuery = usePetTypes();
  const petTypeLabel = useMemo(() => {
    const byId = new Map((petTypesQuery.data ?? []).map((pt) => [pt.id, pt.name]));
    return (id?: number | null) => (id != null ? (byId.get(id) ?? `#${id}`) : '—');
  }, [petTypesQuery.data]);

  const columns = useMemo<ColumnDef<PetResponse>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.id ?? '?'}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Tên',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Loài (free-text)',
        cell: ({ row }) => <Badge variant="outline">{row.original.type ?? '—'}</Badge>,
      },
      {
        accessorKey: 'petTypeId',
        header: 'Loại (catalog)',
        cell: ({ row }) => (
          <Badge variant="secondary">{petTypeLabel(row.original.petTypeId)}</Badge>
        ),
      },
      {
        accessorKey: 'birthDate',
        header: 'Ngày sinh',
        cell: ({ row }) => fmtDate(row.original.birthDate),
      },
      {
        accessorKey: 'ownerId',
        header: 'Chủ nuôi',
        cell: ({ row }) =>
          row.original.ownerId ? (
            <span className="font-mono text-xs">#{row.original.ownerId}</span>
          ) : (
            '—'
          ),
      },
    ],
    [petTypeLabel],
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
                Chưa có thú cưng nào.
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
