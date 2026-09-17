import React from 'react';
import { UserEcoProfile, AuthUser } from '../types';
import { useI18n } from '../i18n';
import { CollectorAvatar } from './CollectorAvatar';

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
      className="fixed inset-0 z-50 bg-[#12352A]/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFFFFF] text-[#12352A] rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border-t sm:border border-[#D8EADF] relative flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-2 border-b border-[#D8EADF]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#16A765] text-[20px]">manage_accounts</span>
            <h3 className="font-editorial italic font-bold text-lg text-[#12352A]">{t('profile')}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7FCF8] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A]"
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Current Active Profile Card */}
        <div className="p-4 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF] flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            {activeRole === 'collector' ? (
              <CollectorAvatar
                name={currentUser.name}
                size="lg"
                showVerifiedBadge={true}
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-[#FFFFFF] border-2 border-[#16A765] flex items-center justify-center text-[#16A765] text-lg font-bold font-editorial shadow-xs shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-editorial text-base font-bold text-[#12352A] truncate">
                  {currentUser.name}
                </h4>
                <span className="material-symbols-outlined text-[#16A765] text-[16px] shrink-0">verified</span>
              </div>
              <p className="text-xs text-[#60766C] truncate">
                {currentUser.email || 'aditi.rao@gmail.com'}
              </p>
              {currentUser.phoneNumber && (
                <p className="text-[11px] text-[#087A4B] font-code-metric font-semibold mt-0.5">
                  {currentUser.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Citizen badges summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#D8EADF] text-center">
            <div className="p-1.5 bg-[#FFFFFF] rounded-lg border border-[#D8EADF]">
              <span className="text-[9px] uppercase tracking-wider text-[#60766C] block font-bold">{t('level')}</span>
              <span className="text-xs font-bold text-[#12352A]">Lvl {currentUser.level}</span>
            </div>
            <div className="p-1.5 bg-[#FFFFFF] rounded-lg border border-[#D8EADF]">
              <span className="text-[9px] uppercase tracking-wider text-[#60766C] block font-bold">{t('ecoScore')}</span>
              <span className="text-xs font-bold text-[#16A765] font-code-metric">{currentUser.ecoScore}/100</span>
            </div>
            <div className="p-1.5 bg-[#FFFFFF] rounded-lg border border-[#D8EADF]">
              <span className="text-[9px] uppercase tracking-wider text-[#60766C] block font-bold">{t('credits')}</span>
              <span className="text-xs font-bold text-[#087A4B] font-code-metric">{currentUser.points} pts</span>
            </div>
          </div>
        </div>

        {/* Workspace Role Switcher */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087A4B]">
            Active Workspace Role
          </span>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F3FBF6] rounded-xl border border-[#D8EADF]">
            <button
              type="button"
              onClick={() => {
                if (onSwitchRole) onSwitchRole('user');
                onClose();
              }}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
                activeRole === 'user'
                  ? 'bg-[#16A765] text-[#FFFFFF] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
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
                  ? 'bg-[#16A765] text-[#FFFFFF] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
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
                  ? 'bg-[#16A765] text-[#FFFFFF] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span>{t('admin')}</span>
            </button>
          </div>
        </div>

        {/* Account Management Options */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087A4B]">
            Account Actions
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="w-full p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F8EE] text-[#12352A] border border-[#D8EADF] transition-colors flex items-center justify-between group text-left shadow-xs"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[18px]">login</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[#12352A]">Log In to User Account</span>
                <span className="text-[10px] text-[#60766C]">Switch to an existing registered citizen account</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#60766C] text-[18px] group-hover:text-[#16A765] transition-colors">
              arrow_forward
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="w-full p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F8EE] text-[#12352A] border border-[#D8EADF] transition-colors flex items-center justify-between group text-left shadow-xs"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[#12352A]">Create New User Account</span>
                <span className="text-[10px] text-[#60766C]">Register with Name, Email, Phone number & OTP</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#60766C] text-[18px] group-hover:text-[#16A765] transition-colors">
              arrow_forward
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenCertificate();
            }}
            className="w-full p-3 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F8EE] text-[#12352A] border border-[#D8EADF] transition-colors flex items-center justify-between group text-left shadow-xs"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-[#12352A]">Green Citizen Certificate</span>
                <span className="text-[10px] text-[#60766C]">View MoHUA SBM-U 2.0 source segregation verification</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#60766C] text-[18px] group-hover:text-[#16A765] transition-colors">
              open_in_new
            </span>
          </button>
        </div>

        {/* Saved Accounts list */}
        {savedUsers.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 border-t border-[#D8EADF]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#60766C]">
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
                        ? 'bg-[#E8F8EE] border-[#16A765]'
                        : 'bg-[#FFFFFF] border-[#D8EADF] hover:bg-[#F7FCF8]'
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-xs font-bold text-[#16A765]">
                        {u.name[0]}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-[#12352A] block truncate">{u.name}</span>
                        <span className="text-[10px] text-[#60766C] truncate block">{u.email}</span>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-[#16A765] px-2 py-0.5 bg-[#FFFFFF] rounded-full border border-[#16A765]/40">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#60766C] hover:text-[#12352A]">Switch</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sign Out Action */}
        <div className="pt-2 border-t border-[#D8EADF]">
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
