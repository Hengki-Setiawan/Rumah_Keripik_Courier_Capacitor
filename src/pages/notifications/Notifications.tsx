import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import type { NotificationItem } from '@/lib/types';

interface NotificationsResponse {
  ok: boolean;
  data: { notifications: NotificationItem[]; unreadCount: number };
}

async function fetchNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  const res = await apiRequest<NotificationsResponse>('/api/courier/notifications?limit=50', { method: 'GET' });
  return res.data;
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  async function markAllRead() {
    await apiRequest('/api/courier/notifications', { method: 'PATCH', body: JSON.stringify({ markAllRead: true }) });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function openNotification(n: NotificationItem) {
    if (!n.isRead) {
      await apiRequest('/api/courier/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationId: n.id }),
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    if (n.relatedDeliveryId) navigate(`/delivery/${n.relatedDeliveryId}`);
  }

  const list = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <AppShell title="Notifikasi">
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-umber-400">{unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</p>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="size-4" /> Tandai semua dibaca
          </Button>
        )}
      </div>

      {isLoading && !data ? (
        <Card><p className="text-center text-sm text-umber-400 py-6">Memuat...</p></Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="size-6" />}
            title="Tidak ada notifikasi"
            description="Notifikasi pengiriman dan informasi penting akan tampil di sini."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((n) => (
            <button key={n.id} onClick={() => openNotification(n)} className="text-left">
              <Card className={cn('transition-colors', !n.isRead && 'border-amber-600/40')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={cn('text-sm', n.isRead ? 'text-umber-300' : 'font-semibold text-umber-100')}>{n.title}</p>
                    {n.body && <p className="mt-1 text-xs text-umber-400">{n.body}</p>}
                    <p className="mt-2 text-[10px] text-umber-500">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}