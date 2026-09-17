import React from 'react';
import { UserEcoProfile } from '../types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserEcoProfile;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#12352A]/60 backdrop-blur-md flex items-center justify-center p-4 transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#FFFFFF] rounded-3xl p-6 flex flex-col gap-4 shadow-xl border border-[#D8EADF] relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F7FCF8] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A]"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Badge emblem */}
        <div className="w-16 h-16 rounded-full bg-[#E8F8EE] text-[#16A765] mx-auto flex items-center justify-center border-2 border-[#16A765] shadow-xs mt-2">
          <span className="material-symbols-outlined text-[36px]">workspace_premium</span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#087A4B] font-bold">
            Ministry of Housing & Urban Affairs Verified
          </span>
          <h3 className="font-editorial italic text-xl font-bold text-[#12352A] mt-1">Green Citizen Certificate</h3>
          <p className="text-xs text-[#60766C] mt-1">
            Awarded under Swachh Bharat Mission (Urban 2.0) Source Segregation Framework.
          </p>
        </div>

        <div className="bg-[#E8F8EE] p-3.5 rounded-2xl text-left flex flex-col gap-2 border border-[#D8EADF]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#60766C]">Citizen:</span>
            <span className="text-[#12352A] font-bold">{user.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#60766C]">Recognition Tier:</span>
            <span className="text-[#087A4B] font-bold">{user.levelTitle} (Lvl {user.level})</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#60766C]">AI Eco Score:</span>
            <span className="text-[#16A765] font-bold font-code-metric">{user.ecoScore} / 100</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#60766C]">Verification ID:</span>
            <span className="text-[#12352A] font-code-metric text-[11px]">IN-KA-BLR-89241</span>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => {
              alert('Certificate downloaded to device.');
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#16A765] text-[#FFFFFF] font-bold text-xs shadow-md hover:bg-[#087A4B] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText?.('I scored 82/100 on EcoScan IN! Verified Green Citizen 🌱');
              alert('Copied certificate share link to clipboard!');
            }}
            className="px-4 py-2.5 rounded-xl bg-[#FFFFFF] text-[#16A765] font-semibold text-xs border border-[#16A765] hover:bg-[#E8F8EE] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
