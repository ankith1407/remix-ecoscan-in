import React from 'react';
import { DbPickupItem } from '../types';
import { CollectorAvatar } from './CollectorAvatar';

interface PickupReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickup: DbPickupItem | null;
  onOpenRating?: (pickup: DbPickupItem) => void;
}

export const PickupReceiptModal: React.FC<PickupReceiptModalProps> = ({
  isOpen,
  onClose,
  pickup,
  onOpenRating,
}) => {
  if (!isOpen || !pickup) return null;

  const handlePrint = () => {
    window.print();
  };

  const finalWeight = pickup.actual_weight || pickup.estimated_weight;
  const finalAmount = pickup.final_value || pickup.estimated_value;
  const unitRate = pickup.rate_per_kg || Math.round(finalAmount / (finalWeight || 1));
  const ecoCredits = Math.max(10, Math.round(finalWeight * 4));

  return (
    <div className="fixed inset-0 z-[70] bg-[#12352A]/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-[#D8EADF] flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 text-[#12352A]">
        {/* Printable Area Header */}
        <div className="bg-[#043324] text-[#FFFFFF] px-6 py-5 flex items-center justify-between border-b border-[#087A4B]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#16A765] flex items-center justify-center text-[#FFFFFF] font-bold">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-editorial italic font-bold text-lg text-[#FFFFFF]">EcoScan</span>
                <span className="bg-[#16A765] text-[#FFFFFF] font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                  RECEIPT
                </span>
              </div>
              <p className="text-[11px] text-[#D8EADF] font-mono">ID: {pickup.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-[#FFFFFF] hover:bg-white/20 flex items-center justify-center transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-5 print:p-0">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#16A765] text-[22px]">check_circle</span>
              <div>
                <span className="text-xs font-bold text-[#087A4B] block">Pickup Completed ✓</span>
                <span className="text-[10px] text-[#60766C]">
                  Verified on {new Date(pickup.completed_at || pickup.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#087A4B] bg-[#FFFFFF] px-2.5 py-1 rounded-full border border-[#D8EADF]">
              +{ecoCredits} Pts
            </span>
          </div>

          {/* Details Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7FCF8] p-3.5 rounded-2xl border border-[#D8EADF]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#60766C] block">Customer</span>
              <span className="font-bold text-[#12352A] block truncate">{pickup.user_name || 'Eco Citizen'}</span>
              <span className="text-[10px] text-[#60766C]">{pickup.user_phone || '+91 98450 12345'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CollectorAvatar
                name={pickup.collector_name || 'Raju Kumar (Green Earth Hub)'}
                size="sm"
                showVerifiedBadge={true}
              />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#60766C] block">Collector Partner</span>
                <span className="font-bold text-[#12352A] block truncate">{pickup.collector_name || 'Raju Kumar (Green Earth Hub)'}</span>
                <span className="text-[10px] text-[#60766C]">{pickup.collector_vehicle || 'TS-09-EC-4821'}</span>
              </div>
            </div>
          </div>

          {/* Itemized Materials Table */}
          <div className="border border-[#D8EADF] rounded-2xl overflow-hidden">
            <div className="bg-[#F3FBF6] px-4 py-2 text-[10px] uppercase font-bold text-[#60766C] grid grid-cols-12 border-b border-[#D8EADF]">
              <span className="col-span-6">Material Item</span>
              <span className="col-span-2 text-right">Weight</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="grid grid-cols-12 text-xs items-center">
                <span className="col-span-6 font-bold text-[#12352A]">{pickup.waste_category}</span>
                <span className="col-span-2 text-right font-mono font-medium">{finalWeight} kg</span>
                <span className="col-span-2 text-right font-mono text-[#60766C]">₹{unitRate}</span>
                <span className="col-span-2 text-right font-mono font-bold text-[#12352A]">₹{finalAmount}</span>
              </div>
              {pickup.items_summary && pickup.items_summary !== pickup.waste_category && (
                <p className="text-[11px] text-[#60766C] italic pt-1 border-t border-[#D8EADF]">
                  Summary: {pickup.items_summary}
                </p>
              )}
            </div>

            {/* Total Footer */}
            <div className="bg-[#F3FBF6] p-3.5 border-t border-[#D8EADF] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#60766C]">Total Verified Weight</span>
                <span className="text-sm font-bold text-[#12352A]">{finalWeight} kg</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-[#60766C]">Total Amount Paid</span>
                <span className="text-base font-editorial font-bold text-[#16A765]">₹{finalAmount}</span>
              </div>
            </div>
          </div>

          {/* Eco Credits & Environmental Impact */}
          <div className="p-3.5 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#16A765] text-[20px]">eco</span>
              <div>
                <span className="text-xs font-bold text-[#087A4B] block">Eco Credits Awarded</span>
                <span className="text-[10px] text-[#60766C]">Diverted {finalWeight} kg scrap from landfill</span>
              </div>
            </div>
            <span className="text-sm font-bold text-[#087A4B] font-mono">+{ecoCredits} Credits</span>
          </div>

          {/* Rating Section if available */}
          {pickup.rating ? (
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#D97706]">Your Rating:</span>
              <div className="flex items-center text-[#D97706] font-bold">
                {'★'.repeat(pickup.rating)}
                {'☆'.repeat(5 - pickup.rating)}
                <span className="ml-1.5 text-xs text-[#12352A]">({pickup.rating}.0)</span>
              </div>
            </div>
          ) : onOpenRating ? (
            <button
              onClick={() => {
                onClose();
                onOpenRating(pickup);
              }}
              type="button"
              className="w-full py-2.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706] border border-[#FDE68A] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">star</span>
              Rate Collector Experience ★★★★★
            </button>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F7FCF8] border-t border-[#D8EADF] grid grid-cols-2 gap-3 print:hidden">
          <button
            onClick={handlePrint}
            type="button"
            className="py-2.5 px-3 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] font-bold text-xs hover:bg-[#E8F8EE] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Receipt
          </button>
          <button
            onClick={onClose}
            type="button"
            className="py-2.5 px-3 rounded-xl bg-[#16A765] text-[#FFFFFF] font-bold text-xs hover:bg-[#087A4B] transition-colors flex items-center justify-center gap-1 shadow-xs"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
