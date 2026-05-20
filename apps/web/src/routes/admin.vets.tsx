import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Stethoscope } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useListVets } from '@/lib/api/generated/vets/vets';
import type { ListVetsParams } from '@/lib/api/generated/model/listVetsParams';

/**
 * Trang list vets cho admin.
 *
 * **TODO (Phase J full)** — sau khi `pnpm fetch:openapi && pnpm generate:api`:
 *  - VetResponse type sẽ có thêm email/phoneNumber/active/resume (Phase A) → hiển thị
 *  - ListVetsParams sẽ có thêm `active`/`specialtyId` filter (Phase A) → thêm filter UI
 *  - Tạo route mới `admin.vets.$id.tsx` với 6 tab (Info/Education/Schedule/Ratings/
 *    Album/Badges) dùng hook chưa generate (useListEducations, useListVetRatings, ...).
 *  - Hiện tại chỉ list cơ bản (firstName + lastName + specialties) — đủ navigation,
 *    chưa có CTA tới detail page (chờ orval regen).
 */
export const Route = createFileRoute('/admin/vets')({
  component: VetsPage,
});

function VetsPage() {
  const [page, setPage] = useState(0);
  const [lastName, setLastName] = useState('');

  const params: ListVetsParams = {
    pageable: { page, size: 12, sort: ['lastName,asc', 'firstName,asc'] },
    ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
  };

  const { data, isLoading, isError, error } = useListVets(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Stethoscope className="h-6 w-6" />
            Bác sĩ thú y
          </h1>
          <p className="text-sm text-muted-foreground">
            Danh sách bác sĩ — bấm để xem hồ sơ chi tiết (đang phát triển).
          </p>
        </div>
        <Input
          placeholder="Tìm theo họ..."
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            setPage(0);
          }}
          className="w-64"
        />
      </div>

      {isError && (
        <Card>
          <CardContent className="py-6 text-destructive">
            Lỗi tải danh sách: {error?.message ?? 'unknown'}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          : (data?.content ?? []).map((vet) => (
              <Card key={vet.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">
                    {vet.firstName} {vet.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {(vet.specialties ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Chưa có chuyên môn
                      </span>
                    ) : (
                      vet.specialties?.map((s) => (
                        <Badge key={s.id ?? s.name} variant="secondary">
                          {s.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {!isLoading && data?.content?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Không tìm thấy bác sĩ nào.
          </CardContent>
        </Card>
      )}

      {data && (data.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= (data.totalPages ?? 1)}
            onClick={() =>
              setPage((p) =>
                p + 1 < (data.totalPages ?? 1) ? p + 1 : p,
              )
            }
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
