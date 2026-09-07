import React, { useState } from 'react';
import { DbUserActivity } from '../types';

interface ActivityTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: DbUserActivity[];
  onSelectPickup?: (pickupId: string) => void;
}

export const ActivityTimelineModal: React.FC<ActivityTimelineModalProps> = ({
  isOpen,
  onClose,
  activities,
  onSelectPickup,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PICKUP' | 'SCAN' | 'CREDIT' | 'REWARD'>('ALL');

  if (!isOpen) return null;

  const filteredActivities = activities.filter((act) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'PICKUP') return act.activity_type.startsWith('PICKUP') || act.activity_type === 'COLLECTOR_ON_THE_WAY' || act.activity_type === 'ON_THE_WAY' || act.activity_type === 'WASTE_COLLECTED' || act.activity_type === 'WEIGHT_VERIFIED' || act.activity_type === 'FINAL_AMOUNT_RECEIVED';
    if (selectedFilter === 'SCAN') return act.activity_type === 'WASTE_SCANNED';
    if (selectedFilter === 'CREDIT') return act.activity_type === 'ECO_CREDITS_EARNED';
    if (selectedFilter === 'REWARD') return act.activity_type === 'REWARD_REDEEMED';
    return true;
  });

  // Group activities into Today, Yesterday, and Earlier
  const groupActivities = (items: DbUserActivity[]) => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groups: { label: string; items: DbUserActivity[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Earlier', items: [] },
    ];

    items.forEach((item) => {
      const itemDate = new Date(item.timestamp || Date.now());
      const itemDateStr = itemDate.toDateString();

      if (itemDateStr === todayStr) {
        groups[0].items.push(item);
      } else if (itemDateStr === yesterdayStr) {
        groups[1].items.push(item);
      } else {
        groups[2].items.push(item);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  };

  const activityGroups = groupActivities(filteredActivities);

  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'WASTE_SCANNED':
        return { icon: 'qr_code_scanner', bg: 'bg-[#E8F3EB] text-[#3FA66B]', badge: 'AI Scan' };
      case 'PICKUP_REQUESTED':
        return { icon: 'local_shipping', bg: 'bg-[#E8F3EB] text-[#172019]', badge: 'Requested' };
      case 'PICKUP_ACCEPTED':
        return { icon: 'task_alt', bg: 'bg-blue-100 text-blue-700', badge: 'Accepted' };
      case 'COLLECTOR_ON_THE_WAY':
      case 'ON_THE_WAY':
        return { icon: 'near_me', bg: 'bg-purple-100 text-purple-700', badge: 'On The Way' };
      case 'WASTE_COLLECTED':
        return { icon: 'where_to_vote', bg: 'bg-indigo-100 text-indigo-700', badge: 'Arrived' };
      case 'WEIGHT_VERIFIED':
        return { icon: 'scale', bg: 'bg-amber-100 text-amber-700', badge: 'Verified' };
      case 'FINAL_AMOUNT_RECEIVED':
        return { icon: 'payments', bg: 'bg-green-100 text-green-700', badge: 'Paid' };
      case 'ECO_CREDITS_EARNED':
        return { icon: 'monetization_on', bg: 'bg-yellow-100 text-yellow-700', badge: '+ Credits' };
      case 'REWARD_REDEEMED':
        return { icon: 'card_giftcard', bg: 'bg-pink-100 text-pink-700', badge: 'Redemption' };
      default:
        return { icon: 'stars', bg: 'bg-gray-100 text-gray-700', badge: 'Activity' };
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#172019] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3FA66B] flex items-center justify-center text-white font-bold shadow-xs">
              <span className="material-symbols-outlined text-[22px]">history</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">User Activity Timeline</h3>
              <p className="text-xs text-emerald-300 font-medium">
                {activities.length} total activity log entries recorded
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PICKUP', label: 'Pickups' },
            { id: 'SCAN', label: 'Waste Scans' },
            { id: 'CREDIT', label: 'Eco Credits' },
            { id: 'REWARD', label: 'Rewards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedFilter === tab.id
                  ? 'bg-[#3FA66B] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activityGroups.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-[#E8F3EB] text-[#3FA66B] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
              </div>
              <p className="font-semibold text-gray-700 text-sm">No activity recorded for this filter</p>
              <p className="text-xs text-gray-500 mt-1">Try selecting another filter above.</p>
            </div>
          ) : (
            activityGroups.map((group) => (
              <div key={group.label} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                  {group.items.map((item) => {
                    const style = getActivityStyle(item.activity_type);

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.pickup_id && onSelectPickup) {
                            onClose();
                            onSelectPickup(item.pickup_id);
                          }
                        }}
                        className={`relative p-3.5 rounded-2xl border transition-all ${
                          item.pickup_id
                            ? 'bg-white border-gray-200 hover:border-[#3FA66B] cursor-pointer shadow-xs hover:shadow-sm'
                            : 'bg-gray-50/70 border-gray-100'
                        }`}
                      >
                        {/* Dot on line */}
                        <div
                          className={`absolute -left-6 top-4 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${style.bg}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{style.icon}</span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-bold text-xs text-[#172019]">{item.title}</h4>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${style.bg}`}>
                                {style.badge}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-snug">{item.description}</p>
                          </div>

                          <span className="text-[10px] font-mono text-gray-400 shrink-0">
                            {formatTime(item.timestamp)}
                          </span>
                        </div>

                        {/* Extra metadata badges */}
                        {(item.amount || item.eco_credits || item.weight) && (
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-2 text-[11px] font-bold">
                            {item.weight && (
                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-100">
                                ⚖️ {item.weight} kg
                              </span>
                            )}
                            {item.amount && (
                              <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded-md border border-green-100">
                                💰 ₹{item.amount}
                              </span>
                            )}
                            {item.eco_credits && (
                              <span className="bg-yellow-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-100">
                                🪙 +{item.eco_credits} Credits
                              </span>
                            )}
                            {item.pickup_id && (
                              <span className="ml-auto text-[10px] text-[#3FA66B] flex items-center gap-0.5">
                                Inspector <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
          >
            Close Activity Log
          </button>
        </div>
      </div>
    </div>
  );
};
