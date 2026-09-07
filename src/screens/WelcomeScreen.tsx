import React from 'react';
import { LanguageSelector } from '../components/LanguageSelector';
import { useI18n } from '../i18n';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onCreateAccount: () => void;
  onContinueAsGuest: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onCreateAccount,
  onContinueAsGuest,
}) => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-[#F5F8F4] text-[#172019] flex flex-col justify-between selection:bg-[#3FA66B] selection:text-[#FFFFFF] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3FA66B]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 right-0 w-80 h-80 bg-[#E8F3EB] rounded-full blur-2xl pointer-events-none"></div>

      {/* Top micro bar */}
      <header className="w-full max-w-lg mx-auto px-6 pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] text-[#174D35] text-[10px] font-bold uppercase tracking-wider shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B] animate-pulse"></span>
          <span>MoHUA & CPCB Certified</span>
        </div>
        <LanguageSelector />
        <button
          onClick={onContinueAsGuest}
          className="text-xs text-[#65736A] hover:text-[#3FA66B] transition-colors font-semibold underline underline-offset-4"
          type="button"
        >
          {t('exploreGuest')}
        </button>
      </header>

      {/* Main Hero & Company Logo Centerpiece */}
      <main className="flex-1 max-w-lg mx-auto w-full px-6 flex flex-col items-center justify-center text-center my-auto py-8 z-10">
        {/* Company Logo Seal */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#FFFFFF] border-2 border-[#DCE5DE] p-2 flex items-center justify-center shadow-md relative group">
            <div className="w-full h-full rounded-2xl bg-[#E8F3EB] border border-[#3FA66B]/30 flex items-center justify-center text-[#3FA66B] shadow-inner">
              <span className="material-symbols-outlined text-[48px] sm:text-[56px] transition-transform duration-300 group-hover:rotate-45">
                recycling
              </span>
            </div>
            {/* Corner aesthetic accent ticks */}
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#3FA66B]"></div>
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#3FA66B]"></div>
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#3FA66B]"></div>
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#3FA66B]"></div>
          </div>
          {/* Version badge */}
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#3FA66B] text-[#FFFFFF] font-code-metric text-[10px] font-bold shadow-xs whitespace-nowrap">
            SBM-Urban 2.0
          </span>
        </div>

        {/* Company Title */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="font-editorial italic text-4xl sm:text-5xl font-bold tracking-tight text-[#172019]">
            EcoScan
          </h1>
          <span className="font-sans text-sm font-bold text-[#3FA66B] px-2 py-0.5 rounded border border-[#DCE5DE] bg-[#FFFFFF] tracking-wider shadow-xs">
            IN
          </span>
        </div>

        {/* Subtitle */}
        <p className="font-editorial italic text-base sm:text-lg text-[#174D35] font-bold mb-3">
          AI Waste Segregation & Circular Economy
        </p>

        <p className="text-xs sm:text-sm text-[#65736A] max-w-sm leading-relaxed mb-8">
          India's intelligent civic platform for 4-bin source segregation, verified scrap market payouts, and doorstep kabadiwala bookings.
        </p>

        {/* Feature pillars */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-8">
          <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center gap-1 text-center shadow-xs">
            <span className="material-symbols-outlined text-[#3FA66B] text-[22px]">center_focus_strong</span>
            <span className="text-[11px] font-bold text-[#172019]">AI Vision</span>
            <span className="text-[9px] text-[#65736A]">Instant 4-Bin Sort</span>
          </div>

          <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center gap-1 text-center shadow-xs">
            <span className="material-symbols-outlined text-[#3FA66B] text-[22px]">electric_rickshaw</span>
            <span className="text-[11px] font-bold text-[#172019]">Doorstep</span>
            <span className="text-[9px] text-[#65736A]">Verified Pickups</span>
          </div>

          <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center gap-1 text-center shadow-xs">
            <span className="material-symbols-outlined text-[#3FA66B] text-[22px]">workspace_premium</span>
            <span className="text-[11px] font-bold text-[#172019]">Green Credits</span>
            <span className="text-[9px] text-[#65736A]">EPR Certificate</span>
          </div>
        </div>

        {/* Primary CTA: Get Started Button */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onGetStarted}
            className="w-full h-14 rounded-2xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] font-bold text-base shadow-[0_8px_24px_rgba(63,166,107,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            type="button"
          >
            <span>{t('getStarted')}</span>
            <span className="material-symbols-outlined text-[22px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </button>

          <button
            onClick={onCreateAccount}
            className="w-full h-12 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#172019] border border-[#DCE5DE] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#3FA66B]">person_add</span>
            <span>{t('createAccount')}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto px-6 pb-6 text-center text-[10px] text-[#65736A] z-10 font-medium">
        In partnership with Urban Local Bodies (ULBs) & Recyclers across India.
      </footer>
    </div>
  );
};
