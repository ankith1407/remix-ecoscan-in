import React, { useState } from 'react';
import { DbNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: DbNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectPickup?: (pickupId: string) => void;
  onOpenActivityHistory?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectPickup,
  onOpenActivityHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;
  const displayedNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.is_read && !n.read)
      : notifications;

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'PICKUP_REQUESTED':
        return { icon: 'local_shipping', bg: 'bg-emerald-100 text-emerald-700' };
      case 'PICKUP_ACCEPTED':
        return { icon: 'task_alt', bg: 'bg-blue-100 text-blue-700' };
      case 'COLLECTOR_ON_THE_WAY':
        return { icon: 'near_me', bg: 'bg-purple-100 text-purple-700' };
      case 'COLLECTOR_ARRIVED':
        return { icon: 'where_to_vote', bg: 'bg-indigo-100 text-indigo-700' };
      case 'WEIGHT_VERIFIED':
        return { icon: 'scale', bg: 'bg-amber-100 text-amber-700' };
      case 'PAYMENT_COMPLETED':
        return { icon: 'payments', bg: 'bg-green-100 text-green-700' };
      case 'CREDIT_EARNED':
        return { icon: 'monetization_on', bg: 'bg-yellow-100 text-yellow-700' };
      case 'REWARD_REDEEMED':
        return { icon: 'card_giftcard', bg: 'bg-pink-100 text-pink-700' };
      default:
        return { icon: 'notifications', bg: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#E8F3EB] border-b border-[#DCE5DE] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#3FA66B] flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div>
              <h3 className="font-bold text-[#172019] text-base leading-tight">Notifications</h3>
              <p className="text-xs text-[#65736A] font-medium">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#65736A] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Tabs & Actions */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'unread'
                  ? 'bg-white text-[#172019] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#172019] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
            >
              All ({notifications.length})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-bold text-[#3FA66B] hover:text-[#2d7d50] flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">done_all</span>
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-gray-50">
          {displayedNotifications.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-[#E8F3EB] text-[#3FA66B] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">notifications_off</span>
              </div>
              <p className="font-semibold text-gray-700 text-sm">No notifications found</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                {activeTab === 'unread'
                  ? "You don't have any unread updates right now."
                  : 'Your notification center is empty.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((notif) => {
              const isUnread = !notif.is_read && !notif.read;
              const style = getNotifIcon(notif.type);

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (isUnread) onMarkRead(notif.id);
                    if (notif.pickup_id && onSelectPickup) {
                      onSelectPickup(notif.pickup_id);
                      onClose();
                    }
                  }}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all cursor-pointer border ${
                    isUnread
                      ? 'bg-[#E8F3EB]/60 border-[#3FA66B]/30 hover:bg-[#E8F3EB]'
                      : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                      <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-bold text-xs text-[#172019] truncate">{notif.title}</h4>
                        <span className="text-[10px] font-medium text-gray-400 shrink-0">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-snug">{notif.message}</p>

                      {notif.pickup_id && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#3FA66B] hover:underline">
                          <span>View Pickup Status</span>
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </div>
                      )}
                    </div>

                    {isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3FA66B] shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
          {onOpenActivityHistory ? (
            <button
              onClick={() => {
                onClose();
                onOpenActivityHistory();
              }}
              className="w-full py-2 px-3 rounded-xl bg-white border border-gray-200 text-[#172019] font-bold text-center hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              View Full Activity Log Timeline
            </button>
          ) : (
            <div className="text-gray-400 text-center w-full">EcoScan Verified System Notifications</div>
          )}
        </div>
      </div>
    </div>
  );
};
