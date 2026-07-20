import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { apiMutator } from '@/lib/api/mutator';

interface UserNotification {
  id: number;
  visitId: number | null;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

interface NotificationPage {
  content: UserNotification[];
}

const notificationsKey = [
  '/api/v1/notifications',
  { pageable: { page: 0, size: 12 } },
] as const;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: notificationsKey,
    queryFn: () =>
      apiMutator<NotificationPage>({
        url: '/api/v1/notifications',
        method: 'GET',
        params: { page: 0, size: 12, sort: 'createdAt,desc' },
      }),
    refetchInterval: 5_000,
  });
  const markRead = useMutation({
    mutationFn: (id: number) =>
      apiMutator<UserNotification>({
        url: `/api/v1/notifications/${id}/read`,
        method: 'PATCH',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });

  const items = notifications.data?.content ?? [];
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div className="relative hidden md:block">
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700"
        title="Thông báo"
        aria-label="Thông báo"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <section className="absolute top-11 right-0 z-50 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-slate-900">Thông báo</p>
              <p className="text-xs text-slate-500">
                {unread ? `${unread} thông báo chưa đọc` : 'Bạn đã đọc tất cả thông báo'}
              </p>
            </div>
            <CheckCheck className="size-5 text-violet-600" />
          </header>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Chưa có thông báo mới.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-violet-50 ${item.readAt ? 'bg-white' : 'bg-violet-50/60'}`}
                  onClick={() => {
                    if (!item.readAt) markRead.mutate(item.id);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!item.readAt ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-violet-600" />
                    ) : (
                      <span className="mt-1.5 size-2 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-sm leading-5 text-slate-600">
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
