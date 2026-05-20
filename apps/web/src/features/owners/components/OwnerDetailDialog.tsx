import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useGetOwner } from '@/lib/api/generated/owners/owners';

interface Props {
  ownerId: number | null;
  onOpenChange: (open: boolean) => void;
}

const dateFmt = new Intl.DateTimeFormat('vi-VN');

function fmtDate(iso?: string): string {
  return iso ? dateFmt.format(new Date(iso)) : '—';
}

export function OwnerDetailDialog({ ownerId, onOpenChange }: Props) {
  const open = ownerId !== null;
  // useGetOwner đã tự enabled: !!(id), vẫn safe khi ownerId null.
  const { data, isLoading } = useGetOwner(ownerId ?? 0, {
    query: { enabled: ownerId !== null },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết chủ nuôi #{ownerId}</DialogTitle>
          <DialogDescription>Thông tin liên hệ và danh sách thú cưng.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải…</p>
        ) : data ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <Row
                label="Họ tên"
                value={`${data.firstName ?? ''} ${data.lastName ?? ''}`}
              />
              <Row label="Địa chỉ" value={data.address ?? '—'} />
              <Row label="Thành phố" value={data.city ?? '—'} />
              <Row label="Điện thoại" value={data.telephone ?? '—'} />
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 text-sm font-medium">
                Thú cưng <Badge variant="secondary">{data.pets?.length ?? 0}</Badge>
              </h3>
              {data.pets && data.pets.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {data.pets.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5"
                    >
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{p.id}
                        </span>{' '}
                        {p.name} <span className="text-muted-foreground">({p.type})</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Sinh {fmtDate(p.birthDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có thú cưng.</p>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
