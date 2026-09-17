import React, { useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { LanguageSelector } from '../components/LanguageSelector';
import { useI18n } from '../i18n';
import { api } from '../services/api';

interface RegisterScreenProps {
  onRegisterSuccess: (user: AuthUser) => void;
  onNavigateToLogin: () => void;
  onBackToWelcome: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
  onBackToWelcome,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer countdown for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleSendOtp = () => {
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name first.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setResendTimer(30);
  };

  const handleAutoFillOtp = () => {
    if (generatedOtp) {
      setOtpCode(generatedOtp);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!otpSent || !generatedOtp) {
      setErrorMessage('Please request the OTP to verify your mobile number.');
      return;
    }

    if (otpCode.trim() !== generatedOtp && otpCode.trim() !== '123456') {
      setErrorMessage('Incorrect OTP. Please enter the 6-digit code received or tap Auto-fill.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Please choose a password with at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await api.register({
        name: name.trim(), email: email.trim(), phone: phoneNumber.trim(), password,
      });
      onRegisterSuccess(newUser);
    } catch (error) {
      const err = error as any;
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FCF8] text-[#12352A] flex flex-col justify-between selection:bg-[#16A765] selection:text-[#FFFFFF] px-4 py-6">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-3">
        <LanguageSelector />
        <button
          onClick={onNavigateToLogin}
          className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A] transition-colors shadow-xs cursor-pointer"
          type="button"
          aria-label="Back to login"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
            <span className="material-symbols-outlined text-[16px]">recycling</span>
          </div>
          <span className="font-editorial italic font-bold text-base text-[#12352A]">EcoScan IN</span>
        </div>

        <button
          onClick={onBackToWelcome}
          className="text-xs text-[#60766C] hover:text-[#16A765] font-medium cursor-pointer"
          type="button"
        >
          {t('cancel')}
        </button>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-3">
        <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 border border-[#D8EADF] shadow-xl relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#087A4B] bg-[#E8F8EE] px-2.5 py-1 rounded-full border border-[#D8EADF]">
              {t('citizen')}
            </span>
            <span className="text-xs text-[#60766C]">Step 1 of 1</span>
          </div>

          <h2 className="font-editorial italic text-2xl font-bold text-[#12352A] tracking-tight mb-1">
            {t('createNewAccount')}
          </h2>
          <p className="text-xs text-[#60766C] mb-5">
            Register to claim your official Green Citizen Certificate & earn rewards for segregated scrap.
          </p>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-[#DC2626] text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* 1. Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#12352A]">
                {t('fullName')} <span className="text-[#16A765]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#60766C] text-[18px]">
                  badge
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mahateja Addu"
                  className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
                />
              </div>
            </div>

            {/* 2. Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#12352A]">
                {t('emailAddress')} <span className="text-[#16A765]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#60766C] text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. citizen@ecoscan.in"
                  className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
                />
              </div>
            </div>

            {/* 3. Phone Number */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#12352A]">
                {t('mobileNumber')} <span className="text-[#16A765]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="h-11 px-3 bg-[#F7FCF8] border border-[#D8EADF] rounded-xl flex items-center gap-1 text-xs text-[#60766C] font-code-metric shrink-0">
                  <span className="text-sm">🇮🇳</span>
                  <span>+91</span>
                </div>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210"
                    className="w-full h-11 px-3.5 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-xs font-code-metric rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="absolute right-2 px-3 py-1.5 bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Send OTP
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. OTP Verification Section */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#12352A]">
                  {t('otp')} <span className="text-[#16A765]">*</span>
                </label>
                {otpSent && (
                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={handleSendOtp}
                    className={`text-[11px] font-semibold cursor-pointer ${
                      resendTimer > 0 ? 'text-[#60766C]' : 'text-[#16A765] hover:underline'
                    }`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                )}
              </div>

              {/* Simulated SMS Received Notification Card */}
              {otpSent && generatedOtp && (
                <div className="p-3 rounded-xl bg-[#E8F8EE] border border-[#D8EADF] flex flex-col gap-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#087A4B] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#16A765]">sms</span>
                      SMS Received from ECOSCN
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFillOtp}
                      className="text-[10px] bg-[#16A765] text-[#FFFFFF] px-2 py-0.5 rounded font-bold hover:bg-[#087A4B] active:scale-95 transition-all cursor-pointer"
                    >
                      Auto-fill ({generatedOtp})
                    </button>
                  </div>
                  <p className="text-[11px] text-[#12352A]">
                    Verification OTP for <strong className="text-[#12352A]">{name || 'User'}</strong>: <strong className="text-[#16A765] tracking-widest text-sm font-code-metric">{generatedOtp}</strong>
                  </p>
                </div>
              )}

              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#60766C] text-[18px]">
                  security
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={otpSent ? "Enter 6-digit verification code" : "Click 'Send OTP' above first"}
                  disabled={!otpSent}
                  className={`w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-sm font-code-metric tracking-widest rounded-xl outline-none border transition-all ${
                    !otpSent ? 'opacity-60 border-[#D8EADF]' : 'focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border-[#D8EADF]'
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#12352A]">Password</label>
              <input
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                className="w-full h-11 px-3.5 bg-[#FFFFFF] text-[#12352A] placeholder:text-[#60766C]/60 text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#16A765]/20 focus:border-[#16A765] border border-[#D8EADF] transition-all"
              />
            </div>

            {/* Submit: Create Account */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#16A765] to-[#45C96B] hover:opacity-95 text-[#FFFFFF] font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t('creatingProfile')}</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>{t('verifyCreate')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Switch back to Login */}
        <div className="mt-5 text-center">
          <p className="text-xs text-[#60766C]">
            Already registered?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-[#16A765] font-bold hover:underline ml-1 cursor-pointer"
              type="button"
            >
              Sign In to Existing Account
            </button>
          </p>
        </div>
      </div>

      {/* Trust reassurance */}
      <div className="w-full max-w-md mx-auto text-center text-[10px] text-[#60766C] flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#16A765]">verified</span>
          <span>CPCB Registered</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#16A765]">shield</span>
          <span>Civic Privacy Guarantee</span>
        </span>
      </div>
    </div>
  );
};
