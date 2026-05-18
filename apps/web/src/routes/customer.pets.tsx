import { Link, createFileRoute } from '@tanstack/react-router';
import { CalendarCheck, Cake, Info, PawPrint, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useListPets } from '@/lib/api/generated/pets/pets';

export const Route = createFileRoute('/customer/pets')({
  component: CustomerPetsPage,
});

const dateFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' });

function CustomerPetsPage() {
  const petsQuery = useListPets({
    pageable: { page: 0, size: 200, sort: ['name,asc'] },
  });

  const pets = petsQuery.data?.content ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Thú cưng của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý hồ sơ các bé — phục vụ đặt lịch khám nhanh chóng.
          </p>
        </div>
        <Button disabled title="Liên hệ phòng khám để thêm thú cưng">
          <Plus className="size-4" /> Thêm thú cưng
        </Button>
      </div>

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="size-5 shrink-0 text-info" />
          <p className="text-muted-foreground">
            Hồ sơ thú cưng do nhân viên phòng khám tạo khi bạn đến lần đầu. Để cập
            nhật hoặc thêm pet mới, vui lòng liên hệ quầy lễ tân hoặc gọi{' '}
            <span className="font-medium text-foreground">1900 8268</span>.
          </p>
        </CardContent>
      </Card>

      {petsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : pets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PawPrint className="size-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Chưa có thú cưng nào</p>
              <p className="text-sm text-muted-foreground">
                Liên hệ phòng khám để được tạo hồ sơ cho bé.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((p) => (
            <Card key={p.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 bg-gradient-to-br from-primary/10 to-primary/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <PawPrint className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{p.name ?? '—'}</CardTitle>
                    <p className="text-xs text-muted-foreground">#{p.id}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white">
                  {p.type ?? 'Khác'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Cake className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ngày sinh:</span>
                  <span className="font-medium">
                    {p.birthDate ? dateFmt.format(new Date(p.birthDate)) : '—'}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/customer/book">
                    <CalendarCheck className="size-4" /> Đặt lịch cho bé
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
