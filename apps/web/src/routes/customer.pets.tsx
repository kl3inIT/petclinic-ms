import { useMemo, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowLeft,
  CalendarCheck,
  PawPrint,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMyOwnerProfile } from '@/lib/api/generated/owners/owners';
import type { PetDto } from '@/lib/api/generated/model/petDto';
import { usePetTypes } from '@/features/pet-types/api';
import { petEmoji } from '@/features/visits/labels';
import { MyPetFormDialog } from '@/features/pets/components/MyPetFormDialog';
import { MyPetDeleteDialog } from '@/features/pets/components/MyPetDeleteDialog';

export const Route = createFileRoute('/customer/pets')({
  component: CustomerPetsPage,
});

/** Tuổi dẫn xuất từ birthDate thật. < 1 năm → theo tháng. */
function petAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 1) return months <= 0 ? '< 1 tháng' : `${months} tháng`;
  return `${years} tuổi`;
}

function CustomerPetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<PetDto | null>(null);
  const [deletingPet, setDeletingPet] = useState<PetDto | null>(null);

  const ownerQuery = useGetMyOwnerProfile();
  const ownerLoading = ownerQuery.isLoading || ownerQuery.isError;
  const petTypesQuery = usePetTypes();

  const petTypeLabel = useMemo(() => {
    const byId = new Map((petTypesQuery.data ?? []).map((pt) => [pt.id, pt.name]));
    return (id?: number | null) =>
      id != null ? (byId.get(id) ?? `#${id}`) : 'Chưa phân loại';
  }, [petTypesQuery.data]);

  const pets = useMemo(
    () =>
      [...(ownerQuery.data?.pets ?? [])].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? ''),
      ),
    [ownerQuery.data],
  );

  const filteredPets = useMemo(() => {
    if (!searchTerm) return pets;
    const term = searchTerm.toLowerCase();
    return pets.filter(
      (p) =>
        (p.name ?? '').toLowerCase().includes(term) ||
        (p.type ?? '').toLowerCase().includes(term) ||
        petTypeLabel(p.petTypeId).toLowerCase().includes(term),
    );
  }, [petTypeLabel, pets, searchTerm]);

  const openCreate = () => {
    setEditingPet(null);
    setFormOpen(true);
  };
  const openEdit = (pet: PetDto) => {
    setEditingPet(pet);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 h-8 gap-1.5 text-muted-foreground"
          >
            <Link to="/customer">
              <ArrowLeft className="size-4" /> Quay lại
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Thú cưng của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý hồ sơ các bé để đặt lịch khám nhanh hơn.
          </p>
        </div>
        <Button className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" /> Thêm thú cưng
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, loài, giống…"
            className="h-10 pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {ownerLoading ? '…' : `${pets.length} thú cưng`}
        </p>
      </div>

      {/* List */}
      {ownerLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-xl" />
          ))}
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center">
          <PawPrint className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {searchTerm ? 'Không tìm thấy thú cưng phù hợp' : 'Chưa có hồ sơ thú cưng'}
          </p>
          {!searchTerm && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5"
              onClick={openCreate}
            >
              <Plus className="size-4" /> Thêm bé đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredPets.map((p) => {
            const age = petAge(p.birthDate);
            const meta = [petTypeLabel(p.petTypeId), p.type?.trim() || null]
              .filter(Boolean)
              .join(' • ');
            const subMeta = [age, p.weight != null ? `${p.weight} kg` : null]
              .filter(Boolean)
              .join(' • ');

            return (
              <div
                key={p.id}
                className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="flex gap-3.5">
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent text-2xl text-accent-foreground">
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt={p.name ?? 'Thú cưng'}
                        className="size-full object-cover"
                      />
                    ) : (
                      petEmoji(p.type)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {p.name ?? '—'}
                      </h3>
                      <Badge
                        variant={p.isActive ? 'secondary' : 'outline'}
                        className={
                          p.isActive
                            ? 'bg-success/10 text-success'
                            : 'text-muted-foreground'
                        }
                      >
                        {p.isActive ? 'Đang nuôi' : 'Tạm ngừng'}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{meta}</p>
                    {subMeta && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {subMeta}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                  <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                    <Link to="/customer/book" search={{ petId: p.id }}>
                      <CalendarCheck className="size-4" /> Đặt lịch
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label="Sửa"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Xóa"
                    onClick={() => setDeletingPet(p)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MyPetFormDialog
        open={formOpen}
        pet={editingPet}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingPet(null);
        }}
      />
      <MyPetDeleteDialog
        pet={deletingPet}
        onOpenChange={(o) => !o && setDeletingPet(null)}
      />
    </div>
  );
}
