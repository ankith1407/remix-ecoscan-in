import React from 'react';
import { DbPickupItem } from '../types';

interface PickupConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickup: DbPickupItem | null;
  onViewPickups?: () => void;
}

export const PickupConfirmationModal: React.FC<PickupConfirmationModalProps> = ({
  isOpen,
  onClose,
  pickup,
  onViewPickups,
}) => {
  if (!isOpen || !pickup) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#172019]/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[#DCE5DE] flex flex-col p-6 gap-4 animate-in fade-in zoom-in-95 duration-200 text-[#172019]">
        {/* Header Success Animation Icon */}
        <div className="flex flex-col items-center justify-center gap-2 text-center pt-2">
          <div className="w-16 h-16 rounded-full bg-[#E8F3EB] border-2 border-[#3FA66B] flex items-center justify-center text-[#3FA66B] shadow-md animate-bounce">
            <span className="material-symbols-outlined text-[36px]">check_circle</span>
          </div>
          <h3 className="font-editorial italic font-bold text-xl text-[#172019]">
            Pickup Requested ✓
          </h3>
          <p className="text-xs text-[#174D35] font-semibold bg-[#E8F3EB] px-3 py-1 rounded-full border border-[#DCE5DE]">
            Status: Finding a nearby verified collector...
          </p>
        </div>

        {/* Pickup ID Banner */}
        <div className="p-3.5 rounded-2xl bg-[#111111] text-[#FFFFFF] border border-[#242824] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A0AEC0] tracking-wider block">EcoScan Pickup ID</span>
            <span className="font-mono text-base font-bold text-[#3FA66B] tracking-wider">{pickup.id}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#A0AEC0] block">Doorstep OTP</span>
            <span className="font-mono text-base font-bold text-[#FFFFFF] tracking-widest">{pickup.otp}</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs bg-[#F5F8F4] p-3.5 rounded-2xl border border-[#DCE5DE]">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#65736A] block">Date & Slot</span>
            <span className="font-bold text-[#172019] block">{pickup.preferred_date}</span>
            <span className="text-[10px] text-[#65736A]">{pickup.preferred_time}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#65736A] block">Est. Weight & Value</span>
            <span className="font-bold text-[#3FA66B] block">₹{pickup.estimated_value}</span>
            <span className="text-[10px] text-[#65736A]">{pickup.estimated_weight} kg estimated</span>
          </div>
          <div className="col-span-2 pt-2 border-t border-[#DCE5DE]">
            <span className="text-[10px] uppercase font-bold text-[#65736A] block">Pickup Address</span>
            <span className="text-xs text-[#172019] font-medium block truncate">{pickup.pickup_address}</span>
          </div>
          {pickup.special_instructions && (
            <div className="col-span-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-[#65736A] block">Special Instructions</span>
              <span className="text-xs text-[#65736A] italic">{pickup.special_instructions}</span>
            </div>
          )}
        </div>

        {/* Security Reassurance */}
        <div className="p-3 rounded-xl bg-[#E8F3EB] border border-[#3FA66B]/30 flex items-center gap-2 text-xs text-[#174D35]">
          <span className="material-symbols-outlined text-[#3FA66B] text-[18px] shrink-0">shield</span>
          <span>Share your 4-digit OTP <strong>{pickup.otp}</strong> with the collector only when they arrive at your doorstep.</span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            type="button"
            className="py-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] font-bold text-xs hover:bg-[#F5F8F4] transition-colors"
          >
            Done
          </button>
          <button
            onClick={() => {
              onClose();
              if (onViewPickups) onViewPickups();
            }}
            type="button"
            className="py-3 rounded-xl bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs hover:bg-[#174D35] transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            View Active Pickup
          </button>
        </div>
      </div>
    </div>
  );
};
