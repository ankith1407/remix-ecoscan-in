import React, { useState } from 'react';
import { AuthUser } from '../types';
import { LanguageSelector } from '../components/LanguageSelector';
import { useI18n } from '../i18n';
import { api } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onNavigateToRegister: () => void;
  onBackToWelcome: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  onBackToWelcome,
}) => {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendOtp = () => {
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or 10-digit mobile number first.');
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedOtp(code);
    setOtpSent(true);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or registered phone number.');
      return;
    }

    if (loginMethod === 'password' && !password.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    if (loginMethod === 'otp') {
      setErrorMessage('OTP login is unavailable until a verified SMS provider is configured. Please use password login.');
      return;
    }

    try {
      const user = await api.login(identifier.includes('@') ? identifier : undefined, identifier.includes('@') ? undefined : identifier, password);
      onLoginSuccess(user);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to sign in. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FCF8] text-[#12352A] flex flex-col justify-between selection:bg-[#16A765] selection:text-[#FFFFFF] px-4 py-6">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-4">
        <button
          onClick={onBackToWelcome}
          className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A] transition-colors shadow-xs cursor-pointer"
          type="button"
          aria-label="Back to welcome"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
            <span className="material-symbols-outlined text-[16px]">recycling</span>
          </div>
          <span className="font-editorial italic font-bold text-base text-[#12352A]">EcoScan IN</span>
        </div>

        <LanguageSelector />
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-4">
        <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 border border-[#D8EADF] shadow-xl relative">
          {/* Decorative badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#087A4B] bg-[#E8F8EE] px-2.5 py-1 rounded-full border border-[#D8EADF]">
              {t('citizen')}
            </span>
            <span className="text-xs text-[#60766C]">{t('profile')}</span>
          </div>

          <h2 className="font-editorial italic text-2xl font-bold text-[#12352A] tracking-tight mb-1">
            {t('welcomeBack')}
          </h2>
          <p className="text-xs text-[#60766C] mb-5">
            Sign in to track your green credits, scrap collections, and certificates.
          </p>

          {/* Login Method Toggle: Password vs OTP */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F7FCF8] rounded-xl border border-[#D8EADF] mb-5">
            <button
              onClick={() => {
                setLoginMethod('password');
                setErrorMessage('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginMethod === 'password'
                  ? 'bg-gradient-to-r from-[#16A765] to-[#45C96B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
              }`}
              type="button"
            >
              {t('password')}
            </button>
            <button
              onClick={() => {
                setLoginMethod('otp');
                setErrorMessage('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginMethod === 'otp'
                  ? 'bg-gradient-to-r from-[#16A765] to-[#45C96B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#60766C] hover:text-[#12352A]'
              }`}
              type="button"
            >
              {t('otp')}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-[#DC2626] text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Identifier (Email / Phone) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#12352A] flex items-center justify-between">
                <span>{t('emailMobile')}</span>
                <span className="text-[10px] text-[#60766C] font-normal">e.g. aditi@gmail.com</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#60766C] text-[18px]">
                  person
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('enterEmailMobile')}
                  className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
                />
              </div>
            </div>

            {/* Password Login Method */}
            {loginMethod === 'password' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#12352A]">{t('password')}</label>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      handleSendOtp();
                    }}
                    className="text-[11px] text-[#16A765] font-bold hover:underline cursor-pointer"
                  >
                    {t('forgotUseOtp')}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#60766C] text-[18px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('enterPassword')}
                    className="w-full h-11 pl-10 pr-10 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#60766C] hover:text-[#12352A] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* OTP Login Method */}
            {loginMethod === 'otp' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#12352A]">{t('verificationCode')}</span>
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs font-bold text-[#16A765] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">send_to_mobile</span>
                      <span>{t('sendOtp')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[11px] text-[#60766C] hover:text-[#16A765] cursor-pointer"
                    >
                      {t('resendOtp')}
                    </button>
                  )}
                </div>

                {/* Simulated SMS banner if OTP sent */}
                {otpSent && simulatedOtp && (
                  <div className="p-3 rounded-xl bg-[#E8F8EE] border border-[#D8EADF] flex flex-col gap-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#087A4B] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#16A765]">sms</span>
                        SMS Sent to {identifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(simulatedOtp)}
                        className="text-[10px] bg-[#16A765] text-[#FFFFFF] px-2 py-0.5 rounded font-bold hover:bg-[#087A4B] cursor-pointer"
                      >
                        Auto-fill ({simulatedOtp})
                      </button>
                    </div>
                    <p className="text-[11px] text-[#12352A]">
                      Your 6-digit EcoScan login OTP is <strong className="text-[#16A765] tracking-widest">{simulatedOtp}</strong>
                    </p>
                  </div>
                )}

                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#60766C] text-[18px]">
                    pin
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-sm font-code-metric tracking-widest rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#16A765] to-[#45C96B] hover:opacity-95 text-[#FFFFFF] font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>{t('signIn')}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Switch to Register link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#60766C]">
            New to EcoScan IN?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-[#16A765] font-bold hover:underline ml-1 cursor-pointer"
              type="button"
            >
              Create New Account
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-[#60766C]">
        Protected under Swachh Bharat Mission (Urban 2.0) Civic Data Privacy Norms.
      </div>
    </div>
  );
};
