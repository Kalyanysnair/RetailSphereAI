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

    if (!email.trim()) {
      setError('Please enter a valid username or email address');
      return;
    }

    setLoading(true);
    try {
      const res = await requestForgotPassword(email);
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

    if (!resetCode.trim()) {
      setError('Please enter the 6-digit verification code sent to your email');
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
    <div className="w-full animate-fadeIn">
      {/* Header for Forgot Password */}
      <div className="text-left mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {step === 'email' && 'Forgot Password'}
          {step === 'reset' && 'Reset Password'}
          {step === 'success' && 'Password Reset!'}
        </h2>
        <p className="mt-1 text-xs text-white/85 font-normal tracking-wide">
          {step === 'email' && 'Enter your username or email address'}
          {step === 'reset' && `Enter code sent to ${email}`}
          {step === 'success' && 'Your password has been reset successfully'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-2.5 text-xs text-red-200 bg-red-900/60 border border-red-500/50 rounded-xl backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Info Message Alert */}
      {infoMessage && (
        <div className="mb-4 p-2.5 text-xs text-emerald-200 bg-emerald-900/60 border border-emerald-500/50 rounded-xl font-medium backdrop-blur-md">
          {infoMessage}
        </div>
      )}

      {/* Step 1: Request Email */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <Input
            type="text"
            placeholder="User Name or Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            endIcon={<Mail className="w-4 h-4 text-white/70" />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full py-3 text-base rounded-2xl"
            isLoading={loading}
            loadingText="Sending code..."
            rightIcon={<ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />}
          >
            Send Verification Code
          </Button>

          <div className="pt-2 text-center">
            <p className="text-xs text-white/80">
              Remember your password?{' '}
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-bold text-white hover:underline focus:outline-none"
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
          <Input
            type="text"
            placeholder="6-Digit Verification Code"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
            endIcon={<KeyRound className="w-4 h-4 text-white/70" />}
            required
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/70 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            endIcon={<Lock className="w-4 h-4 text-white/70" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full py-3 text-base rounded-2xl mt-2"
            isLoading={loading}
            loadingText="Updating password..."
          >
            Update Password
          </Button>

          <div className="pt-2 text-center">
            <p className="text-xs text-white/80">
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-bold text-white hover:underline focus:outline-none"
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
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 mx-auto flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs text-white/90">
            Your password has been successfully reset!
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full py-3 text-base rounded-2xl"
            onClick={onBackToLogin}
          >
            Back to Login
          </Button>
        </div>
      )}
    </div>
  );
};
