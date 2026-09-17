import React, { useState } from 'react';
import { DbNotification, UserRole } from '../types';
import { useI18n } from '../i18n';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole?: UserRole;
  notifications: DbNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectPickup?: (pickupId: string) => void;
  onOpenActivityHistory?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  activeRole = 'user',
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectPickup,
  onOpenActivityHistory,
}) => {
  const { t } = useI18n();
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

  const deskTitle =
    activeRole === 'admin'
      ? 'Admin Control Feed'
      : activeRole === 'collector'
      ? 'Kabadiwala Dispatch Alerts'
      : 'Citizen Recycler Alerts';

  const deskHeaderBg =
    activeRole === 'admin'
      ? 'bg-rose-50 border-rose-200'
      : activeRole === 'collector'
      ? 'bg-amber-50 border-amber-200'
      : 'bg-[#E8F8EE] border-[#D8EADF]';

  const deskBadgeColor =
    activeRole === 'admin'
      ? 'bg-red-600 text-white'
      : activeRole === 'collector'
      ? 'bg-amber-600 text-white'
      : 'bg-[#16A765] text-white';

  const deskIcon =
    activeRole === 'admin'
      ? 'admin_panel_settings'
      : activeRole === 'collector'
      ? 'local_shipping'
      : 'notifications_active';

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#D8EADF] w-full max-w-md max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${deskHeaderBg}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs ${deskBadgeColor}`}>
              <span className="material-symbols-outlined text-[20px]">{deskIcon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#12352A] text-base leading-tight">{deskTitle}</h3>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                  activeRole === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : activeRole === 'collector'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-[#E8F8EE] text-[#16A765]'
                }`}>
                  {activeRole === 'admin' ? 'Admin Desk' : activeRole === 'collector' ? 'Kabadiwala Desk' : 'Citizen Desk'}
                </span>
              </div>
              <p className="text-xs text-[#60766C] font-medium mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#60766C] hover:text-[#12352A] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Tabs & Actions */}
        <div className="px-5 py-3 border-b border-[#D8EADF] bg-white flex items-center justify-between gap-2">
          <div className="flex bg-[#F3FBF6] p-1 rounded-xl border border-[#D8EADF]/60">
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'unread'
                  ? 'bg-white text-[#12352A] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#12352A] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
              }`}
            >
              All ({notifications.length})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-bold text-[#16A765] hover:text-[#087A4B] flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">done_all</span>
              {t('markAllRead')}
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-[#D8EADF]/40">
          {displayedNotifications.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-[#E8F8EE] text-[#16A765] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">notifications_off</span>
              </div>
              <p className="font-semibold text-[#12352A] text-sm">{t('noNotifications')}</p>
              <p className="text-xs text-[#60766C] mt-1 max-w-[220px]">
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
                      ? 'bg-[#E8F8EE]/70 border-[#D8EADF] hover:bg-[#E8F8EE]'
                      : 'bg-white border-transparent hover:bg-[#F3FBF6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                      <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-bold text-xs text-[#12352A] truncate">{notif.title}</h4>
                        <span className="text-[10px] font-medium text-[#60766C] shrink-0">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[#60766C] leading-snug">{notif.message}</p>

                      {notif.pickup_id && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#16A765] hover:underline">
                          <span>View Pickup Status</span>
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </div>
                      )}
                    </div>

                    {isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#16A765] shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F7FCF8] border-t border-[#D8EADF] flex items-center justify-between text-xs">
          {onOpenActivityHistory ? (
            <button
              onClick={() => {
                onClose();
                onOpenActivityHistory();
              }}
              className="w-full py-2 px-3 rounded-xl bg-white border border-[#D8EADF] text-[#12352A] font-bold text-center hover:bg-[#E8F8EE] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              View Full Activity Log Timeline
            </button>
          ) : (
            <div className="text-[#60766C] text-center w-full">EcoScan Verified System Notifications</div>
          )}
        </div>
      </div>
    </div>
  );
};
