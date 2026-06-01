import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Users, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useListOwners } from '@/lib/api/generated/owners/owners';
import type { OwnerResponse } from '@/lib/api/generated/model/ownerResponse';
import { OwnersDataTable } from '@/features/owners/components/OwnersDataTable';
import { OwnerFormDialog } from '@/features/owners/components/OwnerFormDialog';
import { OwnerDetailDialog } from '@/features/owners/components/OwnerDetailDialog';
import { DeleteOwnerDialog } from '@/features/owners/components/DeleteOwnerDialog';

export const Route = createFileRoute('/admin/owners')({
  component: OwnersPage,
});

function OwnersPage() {
  const [lastNameFilter, setLastNameFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<OwnerResponse | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deletingOwner, setDeletingOwner] = useState<OwnerResponse | null>(null);

  // Submit lastName filter on Enter/blur — không debounce ở MVP, BE filter contains/case-insensitive.
  const listQuery = useListOwners({
    pageable: { page: 0, size: 50, sort: ['lastName,asc', 'firstName,asc'] },
    ...(lastNameFilter ? { lastName: lastNameFilter } : {}),
  });
  const ownersLoading = listQuery.isLoading || listQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Owners</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý chủ nuôi — thêm mới, xem chi tiết, xóa.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Thêm chủ nuôi
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Tìm kiếm</CardTitle>
          <div className="relative w-[260px]">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Lọc theo họ…"
              value={lastNameFilter}
              onChange={(e) => setLastNameFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <OwnersDataTable
            data={listQuery.data?.content ?? []}
            isLoading={ownersLoading}
            onView={(o) => o.id !== undefined && setViewingId(o.id)}
            onEdit={(o) => setEditingOwner(o)}
            onDelete={(o) => setDeletingOwner(o)}
          />
          {listQuery.data ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Hiển thị {listQuery.data.content?.length ?? 0} /{' '}
              {listQuery.data.totalElements ?? 0} kết quả
            </p>
          ) : null}
        </CardContent>
      </Card>

      <OwnerFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <OwnerFormDialog
        // key resets form state khi đổi owner đang sửa
        key={editingOwner?.id ?? 'edit'}
        open={!!editingOwner}
        owner={editingOwner}
        onOpenChange={(o) => !o && setEditingOwner(null)}
      />
      <OwnerDetailDialog
        ownerId={viewingId}
        onOpenChange={(o) => !o && setViewingId(null)}
      />
      <DeleteOwnerDialog
        owner={deletingOwner}
        onOpenChange={(o) => !o && setDeletingOwner(null)}
      />
    </div>
  );
}
