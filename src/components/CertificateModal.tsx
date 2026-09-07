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
      className="fixed inset-0 z-50 bg-[#172019]/60 backdrop-blur-md flex items-center justify-center p-4 transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#FFFFFF] rounded-2xl p-6 flex flex-col gap-4 shadow-2xl border border-[#DCE5DE] relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019]"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Badge emblem */}
        <div className="w-16 h-16 rounded-full bg-[#E8F3EB] text-[#3FA66B] mx-auto flex items-center justify-center border-2 border-[#3FA66B] shadow-sm mt-2">
          <span className="material-symbols-outlined text-[36px]">workspace_premium</span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#174D35] font-bold">
            Ministry of Housing & Urban Affairs Verified
          </span>
          <h3 className="font-editorial italic text-xl font-bold text-[#172019] mt-1">Green Citizen Certificate</h3>
          <p className="text-xs text-[#65736A] mt-1">
            Awarded under Swachh Bharat Mission (Urban 2.0) Source Segregation Framework.
          </p>
        </div>

        <div className="bg-[#E8F3EB] p-3.5 rounded-xl text-left flex flex-col gap-2 border border-[#DCE5DE]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#65736A]">Citizen:</span>
            <span className="text-[#172019] font-bold">{user.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#65736A]">Recognition Tier:</span>
            <span className="text-[#174D35] font-bold">{user.levelTitle} (Lvl {user.level})</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#65736A]">AI Eco Score:</span>
            <span className="text-[#3FA66B] font-bold font-code-metric">{user.ecoScore} / 100</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#65736A]">Verification ID:</span>
            <span className="text-[#172019] font-code-metric text-[11px]">IN-KA-BLR-89241</span>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => {
              alert('Certificate downloaded to device.');
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs shadow-md hover:bg-[#174D35] active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
            className="px-4 py-2.5 rounded-xl bg-[#FFFFFF] text-[#3FA66B] font-semibold text-xs border border-[#3FA66B] hover:bg-[#E8F3EB] active:scale-95 transition-all flex items-center justify-center gap-1"
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
