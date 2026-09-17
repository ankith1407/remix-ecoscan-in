import React, { useState } from 'react';
import { Language, UserRole } from '../types';
import { LANGUAGE_OPTIONS, useI18n } from '../i18n';
import { CollectorAvatar } from './CollectorAvatar';

interface HeaderProps {
  language: Language;
  userName?: string;
  activeRole?: UserRole;
  unreadNotificationCount?: number;
  onToggleLanguage: () => void;
  onChangeLanguage?: (language: Language) => void;
  onOpenProfile: () => void;
  onOpenNotifications?: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  userName = 'Citizen',
  activeRole = 'user',
  unreadNotificationCount = 0,
  onToggleLanguage,
  onChangeLanguage,
  onOpenProfile,
  onOpenNotifications,
  onSwitchRole,
}) => {
  const { t } = useI18n();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const initial = userName ? userName[0].toUpperCase() : 'C';

  const roleLabel =
    activeRole === 'admin'
      ? t('adminDesk')
      : activeRole === 'collector'
      ? t('collector')
      : t('citizen');

  const roleColor =
    activeRole === 'admin'
      ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
      : activeRole === 'collector'
      ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
      : 'bg-[#E8F3EB] text-[#174D35] border-[#DCE5DE]';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#FFFFFF]/90 backdrop-blur-md pt-safe border-b border-[#D8EADF] shadow-xs">
      <div className="h-16 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Logo and branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#16A765] to-[#0B5138] flex items-center justify-center text-[#FFFFFF] shadow-md shadow-[#16A765]/20">
            <span className="material-symbols-outlined text-[22px]">eco</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline font-extrabold text-xl tracking-tight text-[#063B2A]">EcoScan</span>
              <span className="font-sans text-[11px] font-bold text-[#FFFFFF] px-1.5 py-0.5 rounded-md bg-[#0B5138]">IN</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#5D7469] font-bold -mt-0.5">
              {t('wasteToValue')}
            </span>
          </div>
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu((v) => !v)}
            type="button"
            className="px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all bg-[#E9F8EF] text-[#063B2A] border-[#D8EADF] hover:border-[#16A765] shadow-2xs cursor-pointer"
            title={t('switchRole')}
          >
            <span className="material-symbols-outlined text-[16px] text-[#16A765]">
              {activeRole === 'admin' ? 'admin_panel_settings' : activeRole === 'collector' ? 'local_shipping' : 'person'}
            </span>
            <span>{roleLabel}</span>
            <span className="material-symbols-outlined text-[16px] text-[#5D7469]">expand_more</span>
          </button>

          {showRoleMenu && (
            <div className="absolute top-10 left-0 z-50 w-48 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] shadow-xl p-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('user');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeRole === 'user' ? 'bg-[#16A765] text-[#FFFFFF]' : 'text-[#12352A] hover:bg-[#F4FBF6]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                {t('citizenUser')}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('collector');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeRole === 'collector' ? 'bg-[#16A765] text-[#FFFFFF]' : 'text-[#12352A] hover:bg-[#F4FBF6]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                {t('kabadiwalaDesk')}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('admin');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                  activeRole === 'admin' ? 'bg-[#16A765] text-[#FFFFFF]' : 'text-[#12352A] hover:bg-[#F4FBF6]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                {t('adminDesk')}
              </button>
            </div>
          )}
        </div>

        {/* Controls: Language, Notifications and Profile */}
        <div className="flex items-center gap-2.5">
          {onOpenNotifications && (
            <button
              aria-label={t('notifications')}
              onClick={onOpenNotifications}
              className="relative h-9 w-9 rounded-full bg-[#F4FBF6] hover:bg-[#E9F8EF] flex items-center justify-center text-[#063B2A] transition-all active:scale-95 border border-[#D8EADF] shadow-2xs cursor-pointer"
              type="button"
              title={t('notifications')}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-[18px] text-[#16A765] absolute left-2.5 pointer-events-none">language</span>
            <select
              aria-label={t('changeLanguage')}
              value={language}
              onChange={(event) => onChangeLanguage?.(event.target.value as Language)}
              className="h-9 pl-8 pr-7 rounded-full bg-[#F4FBF6] hover:bg-[#E9F8EF] text-[#063B2A] transition-all text-xs font-bold border border-[#D8EADF] shadow-2xs appearance-none cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>{option.nativeLabel}</option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[16px] text-[#5D7469] absolute right-2 pointer-events-none">expand_more</span>
          </div>

          <button
            aria-label="Profile Account and Login Options"
            onClick={onOpenProfile}
            className="h-9 pl-1 pr-3 rounded-full bg-[#F4FBF6] hover:bg-[#E9F8EF] border border-[#D8EADF] flex items-center gap-2 active:scale-95 transition-all text-left shadow-2xs cursor-pointer"
            type="button"
            title="User Account, Switch & Create Options"
          >
            {activeRole === 'collector' ? (
              <CollectorAvatar name={userName} size="xs" showVerifiedBadge={false} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#16A765] to-[#0B5138] flex items-center justify-center text-[#FFFFFF] font-bold text-xs shadow-xs">
                <span>{initial}</span>
              </div>
            )}
            <span className="text-xs font-bold text-[#063B2A] max-w-[80px] truncate hidden sm:inline">
              {userName.split(' ')[0]}
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#5D7469]">expand_more</span>
          </button>
        </div>
      </div>
    </header>
  );
};
