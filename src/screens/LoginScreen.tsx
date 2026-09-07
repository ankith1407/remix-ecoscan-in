import React, { useState } from 'react';
import { AuthUser } from '../types';

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

  const handleSubmit = (e: React.FormEvent) => {
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
      if (!otpSent) {
        setErrorMessage('Please request an OTP first.');
        return;
      }
      if (otpCode !== simulatedOtp && otpCode !== '123456') {
        setErrorMessage('Invalid OTP entered. Try clicking Auto-fill or enter the code shown.');
        return;
      }
    }

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const user: AuthUser = {
      id: 'usr_' + Date.now(),
      name: isEmail ? identifier.split('@')[0] : 'Eco Citizen',
      email: isEmail ? identifier : 'user@ecoscan.in',
      phoneNumber: !isEmail ? identifier : '+91 98765 43210',
      createdAt: new Date().toISOString(),
    };

    onLoginSuccess(user);
  };

  const handleQuickDemoLogin = () => {
    const demoUser: AuthUser = {
      id: 'usr_demo_1',
      name: 'Aditi Rao',
      email: 'aditi.rao@gmail.com',
      phoneNumber: '+91 98450 12345',
      createdAt: new Date().toISOString(),
    };
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen bg-[#F5F8F4] text-[#172019] flex flex-col justify-between selection:bg-[#3FA66B] selection:text-[#FFFFFF] px-4 py-6">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-4">
        <button
          onClick={onBackToWelcome}
          className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019] transition-colors shadow-xs"
          type="button"
          aria-label="Back to welcome"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
            <span className="material-symbols-outlined text-[16px]">recycling</span>
          </div>
          <span className="font-editorial italic font-bold text-base text-[#172019]">EcoScan IN</span>
        </div>

        <div className="w-9"></div>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-4">
        <div className="bg-[#FFFFFF] rounded-3xl p-6 sm:p-7 border border-[#DCE5DE] shadow-xl relative">
          {/* Decorative badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#174D35] bg-[#E8F3EB] px-2.5 py-1 rounded-full border border-[#DCE5DE]">
              Citizen Portal
            </span>
            <span className="text-xs text-[#65736A]">Secure Login</span>
          </div>

          <h2 className="font-editorial italic text-2xl font-bold text-[#172019] tracking-tight mb-1">
            Welcome Back
          </h2>
          <p className="text-xs text-[#65736A] mb-5">
            Sign in to track your green credits, scrap collections, and certificates.
          </p>

          {/* Login Method Toggle: Password vs OTP */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5F8F4] rounded-xl border border-[#DCE5DE] mb-5">
            <button
              onClick={() => {
                setLoginMethod('password');
                setErrorMessage('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                loginMethod === 'password'
                  ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
              type="button"
            >
              Password
            </button>
            <button
              onClick={() => {
                setLoginMethod('otp');
                setErrorMessage('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                loginMethod === 'otp'
                  ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
                  : 'text-[#65736A] hover:text-[#172019]'
              }`}
              type="button"
            >
              One-Time OTP
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
              <label className="text-xs font-semibold text-[#172019] flex items-center justify-between">
                <span>Email or Mobile Number</span>
                <span className="text-[10px] text-[#65736A] font-normal">e.g. aditi@gmail.com</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#65736A] text-[18px]">
                  person
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or 10-digit mobile"
                  className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-xs rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                />
              </div>
            </div>

            {/* Password Login Method */}
            {loginMethod === 'password' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#172019]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      handleSendOtp();
                    }}
                    className="text-[11px] text-[#3FA66B] font-bold hover:underline"
                  >
                    Forgot? Use OTP
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#65736A] text-[18px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full h-11 pl-10 pr-10 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-xs rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#65736A] hover:text-[#172019]"
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
                  <span className="text-xs font-semibold text-[#172019]">Verification Code</span>
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs font-bold text-[#3FA66B] hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">send_to_mobile</span>
                      <span>Send OTP</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[11px] text-[#65736A] hover:text-[#3FA66B]"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {/* Simulated SMS banner if OTP sent */}
                {otpSent && simulatedOtp && (
                  <div className="p-3 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#174D35] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">sms</span>
                        SMS Sent to {identifier}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(simulatedOtp)}
                        className="text-[10px] bg-[#3FA66B] text-[#FFFFFF] px-2 py-0.5 rounded font-bold hover:bg-[#174D35]"
                      >
                        Auto-fill ({simulatedOtp})
                      </button>
                    </div>
                    <p className="text-[11px] text-[#172019]">
                      Your 6-digit EcoScan login OTP is <strong className="text-[#3FA66B] tracking-widest">{simulatedOtp}</strong>
                    </p>
                  </div>
                )}

                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#65736A] text-[18px]">
                    pin
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full h-11 pl-10 pr-4 bg-[#FFFFFF] text-[#172019] placeholder:text-[#65736A]/60 text-sm font-code-metric tracking-widest rounded-xl outline-none focus:ring-1 focus:ring-[#3FA66B] border border-[#DCE5DE]"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] font-bold text-sm shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <span>Sign In</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-4 pt-4 border-t border-[#DCE5DE] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2.5 px-3 rounded-xl bg-[#F5F8F4] hover:bg-[#E8F3EB] text-[#172019] text-xs font-bold border border-[#DCE5DE] transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">bolt</span>
              <span>1-Tap Demo Login (Aditi Rao)</span>
            </button>
          </div>
        </div>

        {/* Switch to Register link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#65736A]">
            New to EcoScan IN?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-[#3FA66B] font-bold hover:underline ml-1"
              type="button"
            >
              Create New Account
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-[#65736A]">
        Protected under Swachh Bharat Mission (Urban 2.0) Civic Data Privacy Norms.
      </div>
    </div>
  );
};
