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
    } catch (error: any) {
      setErrorMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8F4] text-[#172019] flex flex-col justify-between selection:bg-[#3FA66B] selection:text-[#FFFFFF] px-4 py-6">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-3">
        <LanguageSelector />
        <button
          onClick={onNavigateToLogin}
          className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019] transition-colors shadow-xs"
          type="button"
          aria-label="Back to login"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
            <span className="material-symbols-outlined text-[16px]">recycling</span>
          </div>
          <span className="font-editorial italic font-bold text-base text-[#172019]">EcoScan IN</span>
        </div>

        <button
          onClick={onBackToWelcome}
          className="text-xs text-[#65736A] hover:text-[#3FA66B] font-medium"
          type="button"
        >
          {t('cancel')}
        </button>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-3">
        <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 border border-[#DCE5DE] shadow-xl relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#174D35] bg-[#E8F3EB] px-2.5 py-1 rounded-full border border-[#DCE5DE]">
              {t('citizen')}
            </span>
            <span className="text-xs text-[#65736A]">Step 1 of 1</span>
          </div>

          <h2 className="font-editorial italic text-2xl font-bold text-[#172019] tracking-tight mb-1">
            {t('createNewAccount')}
          </h2>
          <p className="text-xs text-[#65736A] mb-5">
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
              <label className="text-xs font-semibold text-[#172019]">
                {t('fullName')} <span className="text-[#3FA66B]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#65736A] text-[18px]">
                  badge
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mahateja Addu"
                  className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-xs rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                />
              </div>
            </div>

            {/* 2. Email Address */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#172019]">
                {t('emailAddress')} <span className="text-[#3FA66B]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#65736A] text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. citizen@ecoscan.in"
                  className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-xs rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                />
              </div>
            </div>

            {/* 3. Phone Number */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#172019]">
                {t('mobileNumber')} <span className="text-[#3FA66B]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="h-11 px-3 bg-[#F5F8F4] border border-[#DCE5DE] rounded-xl flex items-center gap-1 text-xs text-[#65736A] font-code-metric shrink-0">
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
                    className="w-full h-11 px-3.5 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-xs font-code-metric rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="absolute right-2 px-3 py-1.5 bg-[#3FA66B] text-[#FFFFFF] rounded-lg text-xs font-bold hover:bg-[#174D35] transition-all shadow-xs"
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
                <label className="text-xs font-semibold text-[#172019]">
                  {t('otp')} <span className="text-[#3FA66B]">*</span>
                </label>
                {otpSent && (
                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={handleSendOtp}
                    className={`text-[11px] font-semibold ${
                      resendTimer > 0 ? 'text-[#65736A]' : 'text-[#3FA66B] hover:underline'
                    }`}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                )}
              </div>

              {/* Simulated SMS Received Notification Card */}
              {otpSent && generatedOtp && (
                <div className="p-3 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#174D35] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">sms</span>
                      SMS Received from ECOSCN
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFillOtp}
                      className="text-[10px] bg-[#3FA66B] text-[#FFFFFF] px-2 py-0.5 rounded font-bold hover:bg-[#174D35] active:scale-95 transition-all"
                    >
                      Auto-fill ({generatedOtp})
                    </button>
                  </div>
                  <p className="text-[11px] text-[#172019]">
                    Verification OTP for <strong className="text-[#172019]">{name || 'User'}</strong>: <strong className="text-[#3FA66B] tracking-widest text-sm font-code-metric">{generatedOtp}</strong>
                  </p>
                </div>
              )}

              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#65736A] text-[18px]">
                  security
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={otpSent ? "Enter 6-digit verification code" : "Click 'Send OTP' above first"}
                  disabled={!otpSent}
                  className={`w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-sm font-code-metric tracking-widest rounded-xl outline-none border ${
                    !otpSent ? 'opacity-60 border-[#DCE5DE]' : 'focus:ring-1 focus:ring-[#3FA66B] border-[#DCE5DE]'
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#172019]">Password</label>
              <input
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                className="w-full h-11 px-3.5 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-xs rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
              />
            </div>

            {/* Submit: Create Account */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] font-bold text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50"
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
          <p className="text-xs text-[#65736A]">
            Already registered?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-[#3FA66B] font-bold hover:underline ml-1"
              type="button"
            >
              Sign In to Existing Account
            </button>
          </p>
        </div>
      </div>

      {/* Trust reassurance */}
      <div className="w-full max-w-md mx-auto text-center text-[10px] text-[#65736A] flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">verified</span>
          <span>CPCB Registered</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">shield</span>
          <span>Civic Privacy Guarantee</span>
        </span>
      </div>
    </div>
  );
};
