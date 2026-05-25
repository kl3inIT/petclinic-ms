import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

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
import type { PetDto } from '@/lib/api/generated/model/petDto';

import { PetFormDialog } from '@/features/pets/components/PetFormDialog';
import { DeletePetDialog } from '@/features/pets/components/DeletePetDialog';
import { usePetTypes } from '@/features/pet-types/api';

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
  const { data, isLoading } = useGetOwner(ownerId ?? 0, {
    query: { enabled: ownerId !== null },
  });

  const [petFormOpen, setPetFormOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetDto | null>(null);
  const [deletingPet, setDeletingPet] = useState<PetDto | null>(null);

  const petTypesQuery = usePetTypes();
  const petTypeLabel = (id?: number | null) =>
    id != null ? (petTypesQuery.data?.find((pt) => pt.id === id)?.name ?? `#${id}`) : '—';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết chủ nuôi #{ownerId}</DialogTitle>
            <DialogDescription>
              Thông tin liên hệ và danh sách thú cưng.
            </DialogDescription>
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
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Thú cưng <Badge variant="secondary">{data.pets?.length ?? 0}</Badge>
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ownerId === null}
                    onClick={() => {
                      setEditingPet(null);
                      setPetFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" /> Thêm pet
                  </Button>
                </div>

                {data.pets && data.pets.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {data.pets.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{p.id}
                          </span>{' '}
                          <span className="font-medium">{p.name}</span>{' '}
                          <span className="text-muted-foreground">
                            ({petTypeLabel(p.petTypeId)})
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Sinh {fmtDate(p.birthDate)}
                            {p.weight != null ? ` • ${p.weight} kg` : ''}
                            {p.isActive === false ? ' • Inactive' : ''}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditingPet(p);
                              setPetFormOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Sửa</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive"
                            onClick={() => setDeletingPet(p)}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        </div>
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

      {ownerId !== null && (
        <PetFormDialog
          // key reset form khi đổi pet đang edit
          key={editingPet?.id ?? 'new-pet'}
          open={petFormOpen}
          ownerId={ownerId}
          pet={editingPet}
          onOpenChange={(o) => {
            setPetFormOpen(o);
            if (!o) setEditingPet(null);
          }}
        />
      )}

      {ownerId !== null && (
        <DeletePetDialog
          ownerId={ownerId}
          pet={deletingPet}
          onOpenChange={(o) => !o && setDeletingPet(null)}
        />
      )}
    </>
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
