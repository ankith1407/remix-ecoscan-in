import React, { useState } from 'react';
import { Language, UserRole } from '../types';

interface HeaderProps {
  language: Language;
  userName?: string;
  activeRole?: UserRole;
  unreadNotificationCount?: number;
  onToggleLanguage: () => void;
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
  onOpenProfile,
  onOpenNotifications,
  onSwitchRole,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const initial = userName ? userName[0].toUpperCase() : 'C';

  const roleLabel =
    activeRole === 'admin'
      ? 'Admin Desk'
      : activeRole === 'collector'
      ? 'Kabadiwala'
      : 'Citizen';

  const roleColor =
    activeRole === 'admin'
      ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
      : activeRole === 'collector'
      ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
      : 'bg-[#E8F3EB] text-[#174D35] border-[#DCE5DE]';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#FFFFFF]/90 backdrop-blur-md pt-safe border-b border-[#DCE5DE] shadow-xs">
      <div className="h-16 max-w-lg mx-auto px-4 flex items-center justify-between gap-2">
        {/* Logo and branding */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E7F0E8] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] shadow-xs">
            <span className="material-symbols-outlined text-[20px]">recycling</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-editorial italic font-bold text-lg tracking-tight text-[#111111]">EcoScan</span>
              <span className="font-sans text-xs font-bold text-[#FFFFFF] px-1.5 py-0.5 rounded bg-[#111111]">IN</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#65736A] font-semibold -mt-0.5">
              Waste to Value Platform
            </span>
          </div>
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu((v) => !v)}
            type="button"
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all ${roleColor}`}
            title="Switch Workspace Role (Citizen / Collector / Admin)"
          >
            <span className="material-symbols-outlined text-[13px]">
              {activeRole === 'admin' ? 'admin_panel_settings' : activeRole === 'collector' ? 'local_shipping' : 'person'}
            </span>
            <span>{roleLabel}</span>
            <span className="material-symbols-outlined text-[12px]">arrow_drop_down</span>
          </button>

          {showRoleMenu && (
            <div className="absolute top-9 left-0 z-50 w-44 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] shadow-xl p-1.5 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('user');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  activeRole === 'user' ? 'bg-[#3FA66B] text-[#FFFFFF]' : 'text-[#172019] hover:bg-[#E8F3EB]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                Citizen User
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('collector');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  activeRole === 'collector' ? 'bg-[#3FA66B] text-[#FFFFFF]' : 'text-[#172019] hover:bg-[#E8F3EB]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                Kabadiwala Desk
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchRole) onSwitchRole('admin');
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  activeRole === 'admin' ? 'bg-[#3FA66B] text-[#FFFFFF]' : 'text-[#172019] hover:bg-[#E8F3EB]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                Admin Desk
              </button>
            </div>
          )}
        </div>

        {/* Controls: Language, Notifications and Profile */}
        <div className="flex items-center gap-2">
          {onOpenNotifications && (
            <button
              aria-label="Notifications"
              onClick={onOpenNotifications}
              className="relative h-8 w-8 rounded-full bg-[#FFFFFF] hover:bg-[#E8F3EB] flex items-center justify-center text-[#172019] transition-colors active:scale-95 border border-[#DCE5DE] shadow-xs"
              type="button"
              title="View Notifications"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC2626] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          <button
            aria-label="Change Language"
            onClick={onToggleLanguage}
            className="h-8 px-2.5 rounded-full bg-[#FFFFFF] hover:bg-[#E8F3EB] flex items-center justify-center gap-0.5 text-[#172019] transition-colors text-xs font-semibold active:scale-95 border border-[#DCE5DE] shadow-xs"
            type="button"
          >
            <span className={language === 'EN' ? 'text-[#3FA66B] font-bold' : 'text-[#65736A]'}>EN</span>
            <span className="text-[#DCE5DE]">/</span>
            <span className={language === 'HI' ? 'text-[#3FA66B] font-bold' : 'text-[#65736A]'}>हिं</span>
          </button>

          <button
            aria-label="Profile Account and Login Options"
            onClick={onOpenProfile}
            className="h-8 pl-1 pr-2.5 rounded-full bg-[#FFFFFF] hover:bg-[#E8F3EB] border border-[#DCE5DE] flex items-center gap-1.5 active:scale-95 transition-all text-left shadow-xs"
            type="button"
            title="User Account, Switch & Create Options"
          >
            <div className="w-6 h-6 rounded-full bg-[#3FA66B] flex items-center justify-center text-[#FFFFFF] font-bold text-xs shadow-xs">
              <span>{initial}</span>
            </div>
            <span className="text-xs font-semibold text-[#172019] max-w-[60px] truncate hidden sm:inline">
              {userName.split(' ')[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
