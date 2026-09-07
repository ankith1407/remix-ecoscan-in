import React from 'react';
import { ScreenType } from '../types';
import { useI18n } from '../i18n';

interface NavigationProps {
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const { t } = useI18n();
  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none">
      <div className="max-w-lg mx-auto px-4 mb-2.5 pointer-events-auto">
        <div className="bg-[#FFFFFF]/95 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgba(17,17,17,0.08)] px-3 py-1.5 border border-[#DCE5DE]">
          <div className="flex justify-between items-center h-14">
            {/* 1. Dashboard */}
            <button
              onClick={() => onSelectScreen('dashboard')}
              aria-current={currentScreen === 'dashboard' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
                currentScreen === 'dashboard'
                  ? 'text-[#3FA66B] font-bold scale-105'
                  : 'text-[#65736A] hover:text-[#111111]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[21px] group-hover:scale-110 transition-transform">
                monitoring
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">{t('dashboard')}</span>
            </button>

            {/* 2. Facilities */}
            <button
              onClick={() => onSelectScreen('facilities')}
              aria-current={currentScreen === 'facilities' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
                currentScreen === 'facilities'
                  ? 'text-[#3FA66B] font-bold scale-105'
                  : 'text-[#65736A] hover:text-[#111111]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[21px] group-hover:scale-110 transition-transform">
                storefront
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">{t('facilities')}</span>
            </button>

            {/* 3. Central AI Scanner Trigger */}
            <div className="flex-1 flex justify-center -translate-y-3">
              <button
                onClick={() => onSelectScreen('scan')}
                aria-label={t('scanWaste')}
                className={`w-12 h-12 rounded-full bg-[#3FA66B] flex items-center justify-center shadow-[0_4px_20px_rgba(63,166,107,0.35)] text-[#FFFFFF] transition-transform active:scale-90 hover:brightness-105 border border-[#3FA66B] ${
                  currentScreen === 'scan' ? 'ring-4 ring-[#3FA66B]/30 scale-105' : ''
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[24px] font-bold">
                  document_scanner
                </span>
              </button>
            </div>

            {/* 4. Rewards */}
            <button
              onClick={() => onSelectScreen('rewards')}
              aria-current={currentScreen === 'rewards' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
                currentScreen === 'rewards'
                  ? 'text-[#3FA66B] font-bold scale-105'
                  : 'text-[#65736A] hover:text-[#111111]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[21px] group-hover:scale-110 transition-transform">
                account_balance_wallet
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">{t('rewards')}</span>
            </button>

            {/* 5. Guide */}
            <button
              onClick={() => onSelectScreen('guide')}
              aria-current={currentScreen === 'guide' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all group ${
                currentScreen === 'guide'
                  ? 'text-[#3FA66B] font-bold scale-105'
                  : 'text-[#65736A] hover:text-[#111111]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[21px] group-hover:scale-110 transition-transform">
                delete_sweep
              </span>
              <span className="text-[10px] mt-0.5 tracking-tight font-semibold">{t('guide')}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
