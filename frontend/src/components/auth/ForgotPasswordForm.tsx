import React, { useState } from 'react';
import { Mail, Lock, KeyRound, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { requestForgotPassword, resetUserPassword } from '../../services/api';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onSuccessPrefillEmail?: (email: string) => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
  onSuccessPrefillEmail,
}) => {
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your username or registered email address.');
      return;
    }
    if (trimmed.includes('@') && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
      setError('Please enter a valid email address (e.g. user@example.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await requestForgotPassword(trimmed);
      setInfoMessage(res.message || 'Verification code sent to your email.');
      setStep('reset');
    } catch (err: any) {
      const msg = err?.message || 'Failed to find registered account.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = resetCode.trim();
    if (!cleanCode) {
      setError('Please enter the 6-digit verification code sent to your email');
      return;
    }
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Verification code must be exactly 6 digits (e.g. 123456)');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetUserPassword(email, resetCode.trim(), newPassword);
      setStep('success');
      onSuccessPrefillEmail?.(email);
    } catch (err: any) {
      const msg = err?.message || 'Password reset failed. Please verify the code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fadeIn space-y-4 text-[#2C241D]">
      {/* Header for Forgot Password */}
      <div className="text-left space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-[#2C241D] tracking-tight">
          {step === 'email' && 'Forgot Password'}
          {step === 'reset' && 'Reset Password'}
          {step === 'success' && 'Password Reset!'}
        </h2>
        <p className="text-xs text-[#5C4E42] font-extrabold">
          {step === 'email' && 'Enter your username or email address'}
          {step === 'reset' && `Enter code sent to ${email}`}
          {step === 'success' && 'Your password has been reset successfully'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-2.5 text-xs text-rose-800 bg-rose-50/80 border border-rose-200 rounded-2xl font-bold backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Info Message Alert */}
      {infoMessage && (
        <div className="p-2.5 text-xs text-emerald-800 bg-emerald-50/80 border border-emerald-300 rounded-2xl font-bold flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Step 1: Request Email */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-3.5">
          <div className="relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border border-white/75 rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]">
            <input
              type="text"
              placeholder="User Name or Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 px-4 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <div className="pr-4 text-[#38A132] pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#48A63E] via-[#38A132] to-[#2E8B29] hover:from-[#3D9634] hover:to-[#267722] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#38A132]/30 hover:shadow-[#38A132]/45 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
          >
            {loading ? 'Sending code...' : 'Send Verification Code'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-1 text-center">
            <p className="text-xs text-[#5C4E42] font-bold">
              Remember your password?{' '}
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-extrabold text-[#38A132] hover:underline focus:outline-none cursor-pointer"
              >
                Login
              </button>
            </p>
          </div>
        </form>
      )}

      {/* Step 2: Verification Code & Reset Password */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-3.5">
          <div className="relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border border-white/75 rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]">
            <input
              type="text"
              placeholder="6-Digit Verification Code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              required
              className="w-full py-3 px-4 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <div className="pr-4 text-[#38A132] pointer-events-none">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>

          <div className="relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border border-white/75 rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full py-3 px-4 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pr-4 text-[#5C4E42] hover:text-[#2C241D] focus:outline-none transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative flex items-center bg-white/45 hover:bg-white/55 focus-within:bg-white/70 backdrop-blur-md border border-white/75 rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/25 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)]">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full py-3 px-4 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#7A6C5E]/75 bg-transparent focus:outline-none"
            />
            <div className="pr-4 text-[#38A132] pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#48A63E] via-[#38A132] to-[#2E8B29] hover:from-[#3D9634] hover:to-[#267722] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#38A132]/30 hover:shadow-[#38A132]/45 border border-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
          >
            {loading ? 'Updating password...' : 'Update Password'}
          </button>

          <div className="pt-1 text-center">
            <p className="text-xs text-[#5C4E42] font-bold">
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-extrabold text-[#38A132] hover:underline focus:outline-none cursor-pointer"
              >
                Back to Login
              </button>
            </p>
          </div>
        </form>
      )}

      {/* Step 3: Success Screen */}
      {step === 'success' && (
        <div className="py-2 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs text-[#5C4E42] font-extrabold">
            Your password has been successfully reset!
          </p>
          <button
            type="button"
            className="w-full py-3.5 bg-gradient-to-r from-[#48A63E] via-[#38A132] to-[#2E8B29] hover:from-[#3D9634] hover:to-[#267722] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#38A132]/30 hover:shadow-[#38A132]/45 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            onClick={onBackToLogin}
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
};
