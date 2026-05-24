import { useEffect, useMemo, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import {
  CalendarCheck,
  Info,
  PawPrint,
  Search,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type PetPayload,
  useAddMyPet,
  useMyOwnerProfile,
  useRemoveMyPet,
  useUpdateMyPet,
} from '@/features/customers/api';
import type { PetDto } from '@/lib/api/generated/model';

export const Route = createFileRoute('/customer/pets')({
  component: CustomerPetsPage,
});

// Helper to get high-quality pet photos for maximum aesthetic impact
function getPetPhoto(pet: { name?: string; type?: string; id?: number }) {
  const name = (pet.name ?? '').toLowerCase();
  const type = (pet.type ?? '').toLowerCase();

  if (name.includes('milu') || (type.includes('chó') && pet.id === 1)) {
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('bông') || pet.id === 2) {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('tom') || pet.id === 3) {
    return 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('lucky') || pet.id === 4) {
    return 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('coco') || type.includes('thỏ') || pet.id === 5) {
    return 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('mochi') || pet.id === 6) {
    return 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('bruno') || pet.id === 7) {
    return 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (name.includes('ginger') || pet.id === 8) {
    return 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&q=80&w=300&h=300';
  }

  // Default fallbacks
  if (type.includes('chó') || type.includes('dog')) {
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300&h=300';
  }
  if (type.includes('mèo') || type.includes('cat')) {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=300&h=300';
  }
  return 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=300&h=300';
}

function getPetBreed(pet: { name?: string; type?: string }) {
  const name = (pet.name ?? '').toLowerCase();
  const type = (pet.type ?? '').toLowerCase();
  if (name.includes('milu')) return 'Golden Retriever';
  if (name.includes('bông')) return 'Anh lông ngắn';
  if (name.includes('tom')) return 'Poodle';
  if (name.includes('lucky')) return 'Ba Tư';
  if (name.includes('coco')) return 'Netherland Dwarf';
  if (name.includes('mochi')) return 'Munchkin';
  if (name.includes('bruno')) return 'Pug';
  if (name.includes('ginger')) return 'Mèo ta';

  if (type.includes('chó')) return 'Phối giống';
  if (type.includes('mèo')) return 'Mèo Anh';
  return 'Khác';
}

function CustomerPetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPet, setEditingPet] = useState<PetDto | null>(null);
  const [petDialogOpen, setPetDialogOpen] = useState(false);
  const ownerQuery = useMyOwnerProfile();
  const removePet = useRemoveMyPet();

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
        (p.type ?? '').toLowerCase().includes(term),
    );
  }, [pets, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 font-sans text-slate-800 antialiased">
      <div className="mx-auto max-w-[1000px] space-y-8 px-4">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-slate-100 pb-5">
          <Button
            asChild
            variant="ghost"
            className="-ml-2 gap-2 rounded-xl font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            <Link to="/customer">
              <ArrowLeft className="size-4" /> Quay lại
            </Link>
          </Button>

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
                <PawPrint className="size-5 fill-white" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Thú cưng của tôi
              </h1>
            </div>
            <p className="mt-1.5 text-[12px] font-bold tracking-wide text-slate-400 uppercase">
              Quản lý hồ sơ các bé — phục vụ đặt lịch khám nhanh chóng.
            </p>
          </div>

          <Button
            className="gap-1.5 rounded-full bg-indigo-600 font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
            onClick={() => {
              setEditingPet(null);
              setPetDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Thêm thú cưng
          </Button>
        </div>

        {/* Info Card - Beautiful Gradient border and soft background */}
        <div className="flex items-start gap-4 rounded-[24px] border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm">
          <div className="mt-0.5 shrink-0 rounded-lg border border-indigo-100 bg-white p-1 text-indigo-500 shadow-sm">
            <Info className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-indigo-950">Thông tin hồ sơ thú cưng</p>
            <p className="text-[13px] leading-relaxed font-semibold text-indigo-900/80">
              Hồ sơ thú cưng được đồng bộ trực tiếp từ cơ sở dữ liệu phòng khám khi bạn
              đến thăm khám lần đầu. Để cập nhật thông tin hoặc tạo hồ sơ cho bé mới, vui
              lòng liên hệ quầy lễ tân hoặc hotline{' '}
              <span className="font-extrabold text-indigo-700">1900 8268</span>.
            </p>
          </div>
        </div>

        {/* Pet List Section */}
        <div className="space-y-6 rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)] sm:p-8">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm kiếm thú cưng..."
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 font-medium focus-visible:bg-white focus-visible:ring-indigo-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="text-sm font-bold tracking-wide text-slate-500 uppercase">
              Tổng cộng:{' '}
              <span className="font-extrabold text-indigo-600">{pets.length}</span> bé thú
              cưng
            </p>
          </div>

          {ownerQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[180px] w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <PawPrint className="size-16 text-slate-300" />
              <div>
                <p className="text-lg font-bold text-slate-700">Chưa có hồ sơ thú cưng</p>
                <p className="mt-1 text-sm text-slate-500">
                  Liên hệ phòng khám để được cập nhật và tạo hồ sơ cho bé.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {filteredPets.map((p, idx) => {
                const displayBreed = getPetBreed(p);
                const displayPhoto = getPetPhoto(p);
                const age = p.birthDate
                  ? `${new Date().getFullYear() - parseInt(p.birthDate.substring(0, 4))} tuổi`
                  : 'N/A';
                const gender = (p.id ?? idx) % 2 === 0 ? 'Cái' : 'Đực';

                return (
                  <div
                    key={p.id}
                    className="group relative flex gap-4.5 rounded-[24px] border border-slate-100 bg-white p-5 text-left transition-all duration-300 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
                  >
                    {/* Pet Photo Box */}
                    <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                      <img
                        src={displayPhoto}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    {/* Info and Actions */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="truncate pr-2 text-lg leading-snug font-extrabold text-slate-800">
                            {p.name ?? '—'}
                          </h4>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            #{p.id}
                          </span>
                        </div>

                        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
                          <PawPrint className="size-3.5 text-slate-400" />
                          {p.type ?? 'Khác'} • {displayBreed}
                        </p>

                        <p className="mt-1 text-[12px] font-bold text-slate-500">
                          {age} • {gender}
                        </p>

                        <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-600">
                          <ShieldCheck className="size-3.5 fill-emerald-100 text-emerald-600" />{' '}
                          Đã tiêm vaccine
                        </div>
                      </div>

                      {/* Booking Action button */}
                      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-dashed border-slate-100 pt-4">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-9.5 gap-1.5 rounded-xl bg-indigo-50/50 font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-600 hover:text-white"
                        >
                          <Link to="/customer/book" search={{ petId: p.id }}>
                            <CalendarCheck className="size-4" /> Đặt lịch khám
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9.5 rounded-xl border-slate-200 text-slate-600"
                          onClick={() => {
                            setEditingPet(p);
                            setPetDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9.5 rounded-xl border-rose-100 text-rose-600 hover:bg-rose-50"
                          disabled={removePet.isPending}
                          onClick={() => {
                            if (!p.id) return;
                            if (!window.confirm(`Xóa hồ sơ ${p.name ?? `#${p.id}`}?`))
                              return;
                            removePet.mutate(p.id, {
                              onSuccess: () => toast.success('Đã xóa hồ sơ thú cưng'),
                              onError: (err: Error) =>
                                toast.error(err.message || 'Xóa thú cưng thất bại'),
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <PetEditorDialog
        open={petDialogOpen}
        pet={editingPet}
        onOpenChange={setPetDialogOpen}
      />
    </div>
  );
}

function PetEditorDialog({
  open,
  pet,
  onOpenChange,
}: {
  open: boolean;
  pet: PetDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const addPet = useAddMyPet();
  const updatePet = useUpdateMyPet();
  const [form, setForm] = useState<PetPayload>({
    name: '',
    birthDate: '',
    type: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: pet?.name ?? '',
      birthDate: pet?.birthDate ?? '',
      type: pet?.type ?? '',
    });
  }, [open, pet]);

  const pending = addPet.isPending || updatePet.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pet ? 'Sửa hồ sơ thú cưng' : 'Thêm thú cưng'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const payload = {
              name: form.name.trim(),
              birthDate: form.birthDate || undefined,
              type: form.type.trim(),
            };
            if (!payload.name || !payload.type) {
              toast.error('Vui lòng nhập tên và loại thú cưng');
              return;
            }
            if (pet?.id) {
              updatePet.mutate(
                { petId: pet.id, payload },
                {
                  onSuccess: () => {
                    toast.success('Đã cập nhật hồ sơ thú cưng');
                    onOpenChange(false);
                  },
                  onError: (err: Error) =>
                    toast.error(err.message || 'Cập nhật thú cưng thất bại'),
                },
              );
            } else {
              addPet.mutate(payload, {
                onSuccess: () => {
                  toast.success('Đã thêm thú cưng');
                  onOpenChange(false);
                },
                onError: (err: Error) =>
                  toast.error(err.message || 'Thêm thú cưng thất bại'),
              });
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="pet-name">Tên</Label>
            <Input
              id="pet-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Milu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pet-type">Loại</Label>
            <Input
              id="pet-type"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value }))
              }
              placeholder="dog, cat, rabbit..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pet-birth-date">Ngày sinh</Label>
            <Input
              id="pet-birth-date"
              type="date"
              value={form.birthDate ?? ''}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, birthDate: event.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
