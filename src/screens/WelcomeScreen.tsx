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

  const ecoSteps = [
    { title: 'AI IDENTIFICATION', icon: 'center_focus_strong', desc: 'Gemini AI Vision' },
    { title: 'WASTE UNDERSTANDING', icon: 'psychology', desc: 'Category & Value' },
    { title: 'SCHEDULE PICKUP', icon: 'calendar_month', desc: 'Doorstep Booking' },
    { title: 'LIVE TRACKING', icon: 'distance', desc: 'Real-time GPS Map' },
    { title: 'OTP VERIFICATION', icon: 'pin', desc: 'Secure 4-Digit Handover' },
    { title: 'COLLECTION', icon: 'scale', desc: 'Digital Scale Weighing' },
    { title: 'REWARD', icon: 'workspace_premium', desc: 'EcoPoints Wallet' },
    { title: 'CIRCULAR RECYCLING', icon: 'recycling', desc: 'Verified Processing' },
  ];

  return (
    <div className="min-h-screen bg-[#F7FCF8] text-[#12352A] flex flex-col justify-between selection:bg-[#16A765] selection:text-[#FFFFFF] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#16A765]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-[400px] h-[400px] bg-[#087A4B]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation Bar */}
      <header className="w-full max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-center text-[#087A4B] shadow-xs">
            <span className="material-symbols-outlined text-[24px] text-[#16A765]">recycling</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-headline font-extrabold text-xl tracking-tight text-[#12352A]">EcoScan</span>
            <span className="text-xs font-bold text-[#16A765] px-1.5 py-0.5 rounded border border-[#D8EADF] bg-[#FFFFFF] shadow-2xs">IN</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#D8EADF] text-[#087A4B] text-[10px] font-bold uppercase tracking-wider shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A765] animate-pulse" />
            <span>AI Smart-City Platform</span>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Hero & Content Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col items-center text-center my-auto z-10">
        
        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#D8EADF] shadow-xs mb-6">
          <span className="material-symbols-outlined text-[#16A765] text-[18px]">verified</span>
          <span className="text-xs font-semibold text-[#087A4B]">Certified Source Segregation & Doorstep Kabadiwala</span>
        </div>

        {/* Hero Title & Subtitle */}
        <h1 className="font-headline font-extrabold text-4xl sm:text-6xl text-[#12352A] tracking-tight leading-[1.1] max-w-2xl mb-4">
          Identify. Recycle. <span className="bg-gradient-to-r from-[#16A765] to-[#45C96B] bg-clip-text text-transparent">Reward.</span>
        </h1>

        <p className="text-base sm:text-lg text-[#60766C] max-w-xl leading-relaxed mb-8 font-medium">
          AI-powered waste identification and smart recycling management. Scan scrap, get real-time market rates, schedule doorstep pickups, and earn verified EcoPoints.
        </p>

        {/* Action CTAs */}
        <div className="w-full max-w-md flex flex-col sm:flex-row gap-3.5 mb-12">
          <button
            onClick={onGetStarted}
            className="flex-1 h-13 rounded-2xl bg-gradient-to-r from-[#16A765] to-[#45C96B] hover:opacity-95 text-[#FFFFFF] font-bold text-sm shadow-[0_6px_20px_rgba(22,167,101,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">center_focus_strong</span>
            <span>SCAN WASTE</span>
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </button>

          <button
            onClick={onContinueAsGuest}
            className="flex-1 h-13 rounded-2xl bg-[#FFFFFF] hover:bg-[#E8F8EE] text-[#12352A] border border-[#D8EADF] font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-[#16A765]">calendar_add_on</span>
            <span>SCHEDULE PICKUP</span>
          </button>
        </div>

        {/* ECO-SPHERE VISUAL MOTIF / WORKFLOW */}
        <div className="w-full bg-[#FFFFFF] rounded-3xl p-6 border border-[#D8EADF] shadow-sm mb-8">
          <div className="flex items-center justify-between border-b border-[#D8EADF] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#16A765] text-[20px]">donut_large</span>
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#087A4B]">
                ECOSPHERE™ CIRCULAR ECOSYSTEM
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#60766C]">End-to-End Smart Lifecycle</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ecoSteps.map((step, idx) => (
              <div
                key={step.title}
                className="p-3.5 rounded-2xl bg-[#F7FCF8] border border-[#D8EADF] flex flex-col items-center text-center gap-1.5 hover:border-[#16A765] transition-colors group shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-center text-[#16A765] group-hover:bg-[#16A765] group-hover:text-[#FFFFFF] transition-colors shadow-2xs">
                  <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                </div>
                <span className="text-[10px] font-extrabold text-[#12352A] leading-tight">
                  0{idx + 1}. {step.title}
                </span>
                <span className="text-[9px] text-[#60766C] font-medium">{step.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full text-left">
          <div className="p-5 rounded-3xl bg-[#FFFFFF] border border-[#D8EADF] shadow-sm flex flex-col gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] flex items-center justify-center text-[#16A765]">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-[#12352A]">Gemini AI Scanner</h3>
            <p className="text-xs text-[#60766C]">Instant material recognition, 4-bin categorization & market rate estimations.</p>
          </div>

          <div className="p-5 rounded-3xl bg-[#FFFFFF] border border-[#D8EADF] shadow-sm flex flex-col gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] flex items-center justify-center text-[#16A765]">
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-[#12352A]">Smart Doorstep Pickups</h3>
            <p className="text-xs text-[#60766C]">Certified local Kabadiwalas with digital scales & live GPS trip tracking.</p>
          </div>

          <div className="p-5 rounded-3xl bg-[#FFFFFF] border border-[#D8EADF] shadow-sm flex flex-col gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] flex items-center justify-center text-[#16A765]">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <h3 className="font-headline font-bold text-sm text-[#12352A]">EcoPoints Loyalty Wallet</h3>
            <p className="text-xs text-[#60766C]">Earn credits for every kg recycled and redeem vouchers for green brands.</p>
          </div>
        </div>

        {/* Quick Login / Account Link */}
        <div className="mt-8 flex items-center gap-4 text-xs">
          <button
            onClick={onCreateAccount}
            className="text-[#087A4B] font-bold hover:underline"
            type="button"
          >
            Create New Account
          </button>
          <span className="text-[#D8EADF]">•</span>
          <button
            onClick={onGetStarted}
            className="text-[#60766C] font-semibold hover:text-[#12352A]"
            type="button"
          >
            Sign In with Password
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-6 pb-6 text-center text-[11px] text-[#60766C] z-10 font-medium">
        EcoScan IN — Smart City Circular Economy Infrastructure for Urban Local Bodies & Recyclers across India.
      </footer>
    </div>
  );
};
