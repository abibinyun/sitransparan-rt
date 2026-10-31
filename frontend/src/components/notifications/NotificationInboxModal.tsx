import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Inbox } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  useNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  InAppNotification,
} from '../../services/notification';
import { formatRelativeTime } from '../../utils/date';

interface NotificationInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationInboxModal: React.FC<NotificationInboxModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useNotificationsQuery(false);
  const markAsReadMutation = useMarkNotificationAsReadMutation();
  const markAllMutation = useMarkAllNotificationsAsReadMutation();

  const notifications = data?.data || [];

  const handleItemClick = (item: InAppNotification) => {
    if (!item.is_read) {
      markAsReadMutation.mutate(item.id);
    }
    onClose();
    if (item.action_url) {
      navigate(item.action_url);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'emergency':
        return <Badge variant="destructive">Darurat</Badge>;
      case 'dues':
        return <Badge className="bg-emerald-600 text-white">Iuran</Badge>;
      case 'waste':
        return <Badge className="bg-amber-600 text-white">Bank Sampah</Badge>;
      case 'announcement':
        return <Badge variant="secondary">Pengumuman</Badge>;
      default:
        return <Badge variant="outline">Kabar</Badge>;
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Kotak Masuk Notifikasi" className="sm:max-w-[480px]">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-semibold text-slate-700">Pemberitahuan</span>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            className="text-xs text-slate-600 hover:text-slate-900 h-7 px-2"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat notifikasi...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Belum ada notifikasi</p>
            <p className="text-xs text-slate-400 mt-1">Pengumuman dan kabar lingkungan akan tampil di sini</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-3 rounded-xl transition-colors cursor-pointer flex gap-3 items-start ${
                !n.is_read ? 'bg-slate-50/80 hover:bg-slate-100/80' : 'hover:bg-slate-50'
              }`}
            >
              <div className="shrink-0 mt-0.5">{getCategoryBadge(n.category)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h4 className={`text-xs font-semibold truncate ${!n.is_read ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(n.created_at)}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{n.body}</p>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />}
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
};
