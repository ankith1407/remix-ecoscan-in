import React from 'react';
import { DbPickupItem } from '../types';
import { CollectorAvatar } from './CollectorAvatar';
import { useI18n } from '../i18n';

interface PickupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickup: DbPickupItem | null;
  onOpenLiveTracking?: (pickupId: string) => void;
}

export const PickupDetailModal: React.FC<PickupDetailModalProps> = ({
  isOpen,
  onClose,
  pickup,
  onOpenLiveTracking,
}) => {
  const { t } = useI18n();
  if (!isOpen || !pickup) return null;

  const steps = [
    { key: 'REQUESTED', title: 'Pickup Requested', desc: 'Doorstep pickup submitted' },
    { key: 'ACCEPTED', title: 'Collector Assigned', desc: 'Collector accepted your request' },
    { key: 'COLLECTOR_ON_THE_WAY', title: 'On The Way', desc: 'Collector en route to location' },
    { key: 'ARRIVED', title: 'Arrived at Doorstep', desc: 'Collector inspecting recyclables' },
    { key: 'WEIGHED', title: 'Weight Verified', desc: 'Actual weight and price confirmed' },
    { key: 'COMPLETED', title: 'Payment & Credits', desc: 'Payout sent & Eco Credits awarded' },
  ];

  const statusOrder: Record<string, number> = {
    REQUESTED: 1,
    ACCEPTED: 2,
    ON_THE_WAY: 3,
    COLLECTOR_ON_THE_WAY: 3,
    ARRIVED: 4,
    WEIGHED: 5,
    COMPLETED: 6,
    CANCELLED: -1,
  };

  const currentLevel = statusOrder[pickup.status] || 1;
  const isCancelled = pickup.status === 'CANCELLED';

  const formatTimestamp = (isoStr?: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#12352A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#D8EADF] w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#043324] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16A765] flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#FFFFFF] text-base">{t('pickupDetails')}</h3>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/80">
                  #{pickup.id.substring(0, 8)}
                </span>
              </div>
              <p className="text-xs text-[#45C96B] font-medium">
                {pickup.waste_category} • {pickup.estimated_weight} kg estimated
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badge & OTP Box */}
          <div className="bg-[#E8F8EE] rounded-2xl p-4 border border-[#D8EADF] flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#60766C] block mb-1">
                Current Status
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A765] animate-pulse" />
                <span className="font-bold text-sm text-[#12352A]">{pickup.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs text-[#60766C] mt-0.5">
                Created on {formatTimestamp(pickup.created_at)}
              </p>
            </div>

            {pickup.otp && !isCancelled && pickup.status !== 'COMPLETED' && (
              <div className="bg-white px-3 py-2 rounded-xl border border-[#D8EADF] text-center shadow-xs">
                <span className="text-[9px] font-bold text-[#60766C] uppercase tracking-widest block">{t('doorstepOtp')}</span>
                <span className="text-lg font-mono font-bold tracking-widest text-[#16A765]">{pickup.otp}</span>
              </div>
            )}
          </div>

          {/* Live tracking button if collector is on the way */}
          {(pickup.status === 'COLLECTOR_ON_THE_WAY' || pickup.status === 'ON_THE_WAY') && onOpenLiveTracking && (
            <button
              onClick={() => {
                onClose();
                onOpenLiveTracking(pickup.id);
              }}
              className="w-full py-3 bg-[#16A765] hover:bg-[#087A4B] text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] animate-bounce">location_on</span>
              Track Collector Live Location
            </button>
          )}

          {/* Key Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F7FCF8] border border-[#D8EADF]">
              <span className="text-[10px] font-bold text-[#60766C] uppercase tracking-wider block mb-1">{t('weight')}</span>
              <div className="text-sm font-bold text-[#12352A]">
                {pickup.actual_weight ? `${pickup.actual_weight} kg (Verified)` : `${pickup.estimated_weight} kg (Est.)`}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7FCF8] border border-[#D8EADF]">
              <span className="text-[10px] font-bold text-[#60766C] uppercase tracking-wider block mb-1">Payout Value</span>
              <div className="text-sm font-bold text-[#16A765]">
                {pickup.final_value ? `₹${pickup.final_value} (Paid)` : `₹${pickup.estimated_value} (Est.)`}
              </div>
            </div>
          </div>

          {/* Collector & Address Details */}
          <div className="space-y-3 bg-white rounded-2xl border border-[#D8EADF] p-4">
            <div className="flex items-center gap-3">
              <CollectorAvatar
                name={pickup.collector_name || 'Raju Kumar (Green Earth Kabadiwala Hub)'}
                size="md"
                showVerifiedBadge={true}
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#60766C] uppercase tracking-wider block">Assigned Collector</span>
                <span className="text-xs font-bold text-[#12352A]">
                  {pickup.collector_name || 'Raju Kumar (Green Earth Kabadiwala Hub)'}
                </span>
                <span className="text-[10px] text-[#16A765] font-semibold">
                  Verified Kabadiwala Partner • 4.9 ★
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-[#D8EADF]">
              <div className="w-8 h-8 rounded-xl bg-[#E8F8EE] flex items-center justify-center text-[#16A765] shrink-0">
                <span className="material-symbols-outlined text-[18px]">home_pin</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#60766C] uppercase tracking-wider block">Pickup Address</span>
                <span className="text-xs text-[#12352A] font-medium">{pickup.pickup_address}</span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Audit Timeline */}
          <div>
            <h4 className="font-bold text-sm text-[#12352A] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#16A765]">timeline</span>
              Pickup Audit Timeline
            </h4>

            {isCancelled ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">cancel</span>
                This pickup request was cancelled.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D8EADF]">
                {steps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = currentLevel >= stepNum;

                  // Find log in pickup.status_history if available
                  const historyLog = pickup.status_history?.find((h) => h.status === step.key);

                  return (
                    <div key={step.key} className="relative flex items-start justify-between gap-3">
                      {/* Circle indicator */}
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isDone
                            ? 'bg-[#16A765] text-white ring-4 ring-[#E8F8EE]'
                            : 'bg-[#D8EADF] text-[#60766C]'
                        }`}
                      >
                        {isDone ? '✓' : stepNum}
                      </div>

                      <div>
                        <h5
                          className={`text-xs font-bold ${
                            isDone ? 'text-[#12352A]' : 'text-[#60766C]/60'
                          }`}
                        >
                          {historyLog ? historyLog.title : step.title}
                        </h5>
                        <p className="text-[11px] text-[#60766C] leading-snug">
                          {historyLog?.note || step.desc}
                        </p>
                      </div>

                      {historyLog?.timestamp && (
                        <span className="text-[10px] font-mono text-[#60766C] shrink-0">
                          {formatTimestamp(historyLog.timestamp)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7FCF8] border-t border-[#D8EADF] text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white border border-[#D8EADF] text-[#12352A] font-bold text-xs hover:bg-[#E8F8EE] transition-colors shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
