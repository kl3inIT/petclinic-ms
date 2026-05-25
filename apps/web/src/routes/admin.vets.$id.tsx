import { useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Award,
  CalendarRange,
  ChevronLeft,
  GraduationCap,
  ImagePlus,
  Star,
  User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useGetVet } from '@/lib/api/generated/vets/vets';
import { VetAlbumTab } from '@/features/vets/components/VetAlbumTab';
import { VetBadgesTab } from '@/features/vets/components/VetBadgesTab';
import { VetEducationTab } from '@/features/vets/components/VetEducationTab';
import { VetInfoTab } from '@/features/vets/components/VetInfoTab';
import { VetRatingsTab } from '@/features/vets/components/VetRatingsTab';
import { VetScheduleTab } from '@/features/vets/components/VetScheduleTab';
import { cn } from '@/lib/utils';

const TAB_DEFS = [
  { id: 'info', label: 'Hồ sơ', icon: UserIcon },
  { id: 'education', label: 'Bằng cấp', icon: GraduationCap },
  { id: 'schedule', label: 'Lịch trực', icon: CalendarRange },
  { id: 'ratings', label: 'Đánh giá', icon: Star },
  { id: 'album', label: 'Hình ảnh', icon: ImagePlus },
  { id: 'badges', label: 'Huy hiệu', icon: Award },
] as const;

type TabId = (typeof TAB_DEFS)[number]['id'];

export const Route = createFileRoute('/admin/vets/$id')({
  component: VetDetailPage,
});

function VetDetailPage() {
  const { id } = Route.useParams();
  const vetId = Number(id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('info');

  const vetQuery = useGetVet(vetId);

  if (vetQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (vetQuery.isError || !vetQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Không tải được thông tin bác sĩ (id={id}).
          <div className="mt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/vets">Quay lại</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const vet = vetQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/vets">
              <ChevronLeft />
              Danh sách
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {vet.firstName} {vet.lastName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{vet.email}</span>
              {vet.phoneNumber && <span>· {vet.phoneNumber}</span>}
              <Badge variant={vet.active ? 'default' : 'outline'}>
                {vet.active ? 'Đang hoạt động' : 'Tạm ngưng'}
              </Badge>
              {(vet.specialties ?? []).map((s) => (
                <Badge key={s.id ?? s.name} variant="secondary">
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b">
        {TAB_DEFS.map((t) => (
          <TabButton
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      </nav>

      <div>
        {tab === 'info' && (
          <VetInfoTab vet={vet} onDeleted={() => navigate({ to: '/admin/vets' })} />
        )}
        {tab === 'education' && <VetEducationTab vetId={vetId} />}
        {tab === 'schedule' && <VetScheduleTab vetId={vetId} />}
        {tab === 'ratings' && <VetRatingsTab vetId={vetId} />}
        {tab === 'album' && <VetAlbumTab vetId={vetId} />}
        {tab === 'badges' && <VetBadgesTab vetId={vetId} />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, icon: Icon, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors',
        active
          ? 'border-primary font-semibold text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
