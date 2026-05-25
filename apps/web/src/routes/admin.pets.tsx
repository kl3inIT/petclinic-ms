import { createFileRoute } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useListPets } from '@/lib/api/generated/pets/pets';
import { PetsDataTable } from '@/features/pets/components/PetsDataTable';

export const Route = createFileRoute('/admin/pets')({
  component: PetsPage,
});

function PetsPage() {
  // Read-only ở admin.pets — Pet write thực hiện qua trang Owners
  // (mỗi Pet thuộc 1 Owner aggregate, không tạo Pet "không chủ").
  // Endpoint write: POST/PUT/DELETE /api/v1/owners/{id}/pets[/{petId}].
  const listQuery = useListPets({ pageable: { page: 0, size: 50, sort: ['name,asc'] } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PawPrint className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Pets</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách thú cưng (read-only). Thêm / sửa / xóa thú cưng tại trang
            <span className="font-medium"> Owners → Xem chi tiết</span>.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tất cả thú cưng</CardTitle>
        </CardHeader>
        <CardContent>
          <PetsDataTable
            data={listQuery.data?.content ?? []}
            isLoading={listQuery.isLoading}
          />
          {listQuery.data ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Hiển thị {listQuery.data.content?.length ?? 0} /{' '}
              {listQuery.data.totalElements ?? 0} kết quả
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
