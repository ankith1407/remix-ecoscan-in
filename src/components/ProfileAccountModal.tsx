import React from 'react';
import { UserEcoProfile, AuthUser } from '../types';
import { useI18n } from '../i18n';

interface ProfileAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserEcoProfile;
  savedUsers: AuthUser[];
  activeRole?: 'user' | 'collector' | 'admin';
  onSwitchRole?: (role: 'user' | 'collector' | 'admin') => void;
  onSwitchAccount: (user: AuthUser) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenCertificate: () => void;
  onSignOut: () => void;
}

export const ProfileAccountModal: React.FC<ProfileAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  savedUsers,
  activeRole = 'user',
  onSwitchRole,
  onSwitchAccount,
  onOpenLogin,
  onOpenRegister,
  onOpenCertificate,
  onSignOut,
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  // Derive initials for avatar
  const initials = currentUser.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'EC';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172019]/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFFFFF] text-[#172019] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-[#DCE5DE] relative flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-2 border-b border-[#DCE5DE]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#3FA66B] text-[20px]">manage_accounts</span>
            <h3 className="font-editorial italic font-bold text-lg text-[#172019]">{t('profile')}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019]"
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Current Active Profile Card */}
        <div className="p-4 rounded-2xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-[#FFFFFF] border-2 border-[#3FA66B] flex items-center justify-center text-[#3FA66B] text-lg font-bold font-editorial shadow-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-editorial text-base font-bold text-[#172019] truncate">
                  {currentUser.name}
                </h4>
                <span className="material-symbols-outlined text-[#3FA66B] text-[16px] shrink-0">verified</span>
              </div>
              <p className="text-xs text-[#65736A] truncate">
                {currentUser.email || 'aditi.rao@gmail.com'}
              </p>
              {currentUser.phoneNumber && (
                <p className="text-[11px] text-[#174D35] font-code-metric font-semibold mt-0.5">
                  {currentUser.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Citizen badges summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DCE5DE] text-center">
            <div className="p-1.5 bg-[#FFFFFF] rounded-lg border border-[#DCE5DE]">
              <span className="text-[9px] uppercase tracking-wider text-[#65736A] block font-bold">{t('level')}</span>
              <span className="text-xs font-bold text-[#172019]">Lvl {currentUser.level}</span>
            </div>
            <div className="p-1.5 bg-[#FFFFFF] rounded-lg border border-[#DCE5DE]">
              <span className="text-[9px] uppercase tracking-wider text-[#65736A] block font-bold">{t('ecoScore')}</span>
              <span className="text-xs font-bold text-[#3FA66B] font-code-metric">{currentUser.ecoScore}/100</span>
            </div>
            <div className="p-1.5 bg-[#FFFFFF] rounded-lg border border-[#DCE5DE]">
              <span className="text-[9px] uppercase tracking-wider text-[#65736A] block font-bold">{t('credits')}</span>
              <span className="text-xs font-bold text-[#174D35] font-code-metric">{currentUser.points} pts</span>
            </div>
          </div>
        </div>

        {/* Workspace Role Switcher */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#174D35]">
            Active Workspace Role
          </span>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F5F8F4] rounded-xl border border-[#DCE5DE]">
            <button
              type="button"
              onClick={() => {
                if (onSwitchRole) onSwitchRole('user');
                onClose();
              }}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                activeRole === 'user'
                  ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span>{t('citizen')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onSwitchRole) onSwitchRole('collector');
                onClose();
              }}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                activeRole === 'collector'
                  ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>{t('collector')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onSwitchRole) onSwitchRole('admin');
                onClose();
              }}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                activeRole === 'admin'
                  ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span>{t('admin')}</span>
            </button>
          </div>
        </div>

        {/* Account Management Options */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#174D35]">
            Account Actions
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="w-full p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#172019] border border-[#DCE5DE] transition-colors flex items-center justify-between group text-left shadow-xs"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[18px]">login</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[#172019]">Log In to User Account</span>
                <span className="text-[10px] text-[#65736A]">Switch to an existing registered citizen account</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#65736A] text-[18px] group-hover:text-[#3FA66B] transition-colors">
              arrow_forward
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="w-full p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#172019] border border-[#DCE5DE] transition-colors flex items-center justify-between group text-left shadow-xs"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[#172019]">Create New User Account</span>
                <span className="text-[10px] text-[#65736A]">Register with Name, Email, Phone number & OTP</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#65736A] text-[18px] group-hover:text-[#3FA66B] transition-colors">
              arrow_forward
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCertificate();
            }}
            className="w-full p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#172019] border border-[#DCE5DE] transition-colors flex items-center justify-between group text-left shadow-xs"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[#172019]">Green Citizen Certificate</span>
                <span className="text-[10px] text-[#65736A]">View MoHUA SBM-U 2.0 source segregation verification</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#65736A] text-[18px] group-hover:text-[#3FA66B] transition-colors">
              open_in_new
            </span>
          </button>
        </div>

        {/* Saved Accounts list */}
        {savedUsers.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 border-t border-[#DCE5DE]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#65736A]">
              Switch Saved Accounts
            </span>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {savedUsers.map((u) => {
                const isCurrent = u.name === currentUser.name;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchAccount(u);
                      onClose();
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isCurrent
                        ? 'bg-[#E8F3EB] border-[#3FA66B]'
                        : 'bg-[#FFFFFF] border-[#DCE5DE] hover:bg-[#F5F8F4]'
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-xs font-bold text-[#3FA66B]">
                        {u.name[0]}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-[#172019] block truncate">{u.name}</span>
                        <span className="text-[10px] text-[#65736A] truncate block">{u.email}</span>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-[#3FA66B] px-2 py-0.5 bg-[#FFFFFF] rounded-full border border-[#3FA66B]/40">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#65736A] hover:text-[#172019]">Switch</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sign Out Action */}
        <div className="pt-2 border-t border-[#DCE5DE]">
          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full py-2.5 rounded-xl bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#DC2626] border border-[#FCA5A5] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out & Back to Welcome</span>
          </button>
        </div>
      </div>
    </div>
  );
};
