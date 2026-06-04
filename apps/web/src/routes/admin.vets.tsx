import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  CreditCard,
  Mail,
  Phone,
  Plus,
  Search,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/lib/form/FieldError';

import { useListSpecialties } from '@/lib/api/generated/specialties/specialties';
import { useCreateVet, useListVets } from '@/lib/api/generated/vets/vets';
import type { ListVetsParams } from '@/lib/api/generated/model';
import { vetSchema } from '@/features/vets/schemas';

export const Route = createFileRoute('/admin/vets')({
  component: VetsPage,
});

type ActiveFilter = 'all' | 'active' | 'inactive';

function VetsPage() {
  const [page, setPage] = useState(0);
  const [lastName, setLastName] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const params: ListVetsParams = {
    pageable: { page, size: 12, sort: ['lastName,asc', 'firstName,asc'] },
    ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
    ...(activeFilter !== 'all' ? { active: activeFilter === 'active' } : {}),
  };

  const { data, isLoading, isError } = useListVets(params);
  const showLoadingSkeleton = isLoading || isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Stethoscope className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Bác sĩ thú y</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý danh sách bác sĩ — bấm thẻ để xem hồ sơ chi tiết.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Thêm bác sĩ
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
          <CardTitle className="text-base">Tìm kiếm</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={activeFilter}
              onValueChange={(v) => {
                setActiveFilter(v as ActiveFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="inactive">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-64">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Lọc theo họ…"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setPage(0);
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {showLoadingSkeleton
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
              <Link
                key={vet.id}
                to="/admin/vets/$id"
                params={{ id: String(vet.id ?? 0) }}
                className="block"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>
                        {vet.firstName} {vet.lastName}
                      </span>
                      <ChevronRightIcon className="size-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {vet.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="size-3.5" />
                          {vet.email}
                        </p>
                      )}
                      {vet.phoneNumber && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="size-3.5" />
                          {vet.phoneNumber}
                        </p>
                      )}
                      {vet.vetBillId && (
                        <p className="flex items-center gap-1.5">
                          <CreditCard className="size-3.5" />
                          {vet.vetBillId}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={vet.active ? 'default' : 'outline'}>
                        {vet.active ? 'Hoạt động' : 'Tạm ngưng'}
                      </Badge>
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
              </Link>
            ))}
      </div>

      {!showLoadingSkeleton && data?.content?.length === 0 && (
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
            <ChevronLeft className="size-4" />
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= (data.totalPages ?? 1)}
            onClick={() => setPage((p) => (p + 1 < (data.totalPages ?? 1) ? p + 1 : p))}
          >
            Sau
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <CreateVetDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateVetDialog({ open, onOpenChange }: CreateDialogProps) {
  const qc = useQueryClient();
  const specialtiesQuery = useListSpecialties();
  const [specialtyNames, setSpecialtyNames] = useState<string[]>([]);

  const createMutation = useCreateVet({
    mutation: {
      onSuccess: () => {
        toast.success('Đã tạo bác sĩ');
        void qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey[0];
            return typeof k === 'string' && k.startsWith('/api/v1/vets');
          },
        });
        form.reset();
        setSpecialtyNames([]);
        onOpenChange(false);
      },
      onError: (err: Error) => toast.error(err.message || 'Lỗi'),
    },
  });

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      vetBillId: '',
      resume: '',
    },
    validators: { onChange: vetSchema },
    onSubmit: ({ value }) =>
      createMutation.mutate({
        data: {
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          phoneNumber: value.phoneNumber || undefined,
          vetBillId: value.vetBillId || undefined,
          resume: value.resume || undefined,
          specialtyNames,
        },
      }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          form.reset();
          setSpecialtyNames([]);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm bác sĩ mới</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="firstName"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Tên *</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="lastName"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Họ *</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>
          <form.Field
            name="email"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email *</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <form.Field
              name="phoneNumber"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>SĐT</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
            <form.Field
              name="vetBillId"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Mã billing</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="VD: BILL-001"
                  />
                  <FieldError field={field} />
                </div>
              )}
            />
          </div>
          <form.Field
            name="resume"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Tiểu sử</Label>
                <Textarea
                  id={field.name}
                  rows={3}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          />
          <div className="space-y-2">
            <Label>Chuyên môn</Label>
            <div className="flex flex-wrap gap-2">
              {specialtiesQuery.data?.map((s) => {
                const name = s.name ?? '';
                if (!name) return null;
                const selected = specialtyNames.includes(name);
                return (
                  <button
                    key={s.id ?? name}
                    type="button"
                    onClick={() =>
                      setSpecialtyNames((cur) =>
                        cur.includes(name)
                          ? cur.filter((n) => n !== name)
                          : [...cur, name],
                      )
                    }
                  >
                    <Badge variant={selected ? 'default' : 'outline'}>{name}</Badge>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Tạo bác sĩ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
