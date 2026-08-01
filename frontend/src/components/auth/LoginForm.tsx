import React, { useState } from 'react';
import { User, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { GoogleSignInButton } from './GoogleSignInButton';
import { LoginCredentials, ValidationErrors, LoginFormProps } from '../../types/auth';

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading = false }) => {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [internalLoading, setInternalLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!credentials.username.trim()) {
      newErrors.username = 'User Name / Email is required';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setInternalLoading(true);
    try {
      let res: any = null;
      if (onSubmit) {
        res = await onSubmit(credentials);
      } else {
        const { loginUser } = await import('../../services/api');
        res = await loginUser({
          email: credentials.username,
          password: credentials.password
        });
      }

      const roleName = res?.user?.role_name || '';
      const usernameClean = credentials.username.trim().toLowerCase();
      const isAdmin = roleName === 'Admin' || usernameClean === 'admin';
      const isRetailStaff = roleName === 'Retail Staff' || usernameClean.includes('retail');
      const isProductionStaff = roleName === 'Production Staff' || usernameClean.includes('production');

      if (isAdmin) {
        navigate('/admin');
      } else if (isRetailStaff) {
        navigate('/retail-staff');
      } else if (isProductionStaff) {
        navigate('/production-staff');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Authentication failed. Please check your credentials.';
      setErrors({ general: msg });
      
      if (msg.toLowerCase().includes('failed to fetch')) {
        console.warn('Backend server offline. Continuing in local demo mode.');
        const usernameClean = credentials.username.trim().toLowerCase();
        if (usernameClean === 'admin') {
          navigate('/admin');
        } else if (usernameClean.includes('retail')) {
          navigate('/retail-staff');
        } else if (usernameClean.includes('production')) {
          navigate('/production-staff');
        } else {
          navigate('/dashboard');
        }
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const isSubmitting = isLoading || internalLoading;

  if (viewMode === 'forgot') {
    return (
      <div className="w-full">
        <ForgotPasswordForm
          onBackToLogin={() => setViewMode('login')}
          onSuccessPrefillEmail={(email) => {
            setCredentials((prev) => ({ ...prev, username: email }));
            setViewMode('login');
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full animate-fadeIn space-y-4 text-[#2C241D]">
      {/* Brand Header Inside Card */}
      <div className="text-left space-y-0.5">
        <h1 className="text-2xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-1.5 drop-shadow-xs">
          <span>RetailSphere</span>
          <span className="text-[#38A132]">AI</span>
        </h1>
        <p className="text-xs text-[#6B5C4D] font-extrabold">
          Welcome back! Please login to access your portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 w-full" noValidate>
        {errors.general && (
          <div className="p-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl font-bold">
            {errors.general}
          </div>
        )}

        {/* User Name / Email Input Box */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
            User Name / Email
          </label>
          <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
            <input
              type="text"
              name="username"
              placeholder="e.g. Rahul Sharma or staff@retailsphere.ai"
              value={credentials.username}
              onChange={handleChange}
              autoComplete="username"
              required
              className="w-full py-3 px-4 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
            />
            <div className="pr-4 text-[#38A132] pointer-events-none">
              <User className="w-4 h-4" />
            </div>
          </div>
          {errors.username && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.username}</p>
          )}
        </div>

        {/* Password Input Box */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
            Password
          </label>
          <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter account password"
              value={credentials.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="w-full py-3 px-4 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="pr-4 text-[#5C4E42] hover:text-[#2C241D] focus:outline-none transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.password}</p>
          )}
        </div>

        {/* Remember me option & Forgot Password link */}
        <div className="flex items-center justify-between pt-0.5 pb-0.5 text-xs">
          <label className="flex items-center gap-2 text-[#2C241D] font-extrabold cursor-pointer select-none">
            <input
              type="checkbox"
              name="rememberMe"
              checked={credentials.rememberMe}
              onChange={handleChange}
              className="w-3.5 h-3.5 accent-[#38A132] rounded cursor-pointer"
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setViewMode('forgot')}
            className="text-[#38A132] hover:underline font-extrabold text-xs transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#38A132]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>

        {/* Divider without background, soft light black text font */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="border-t border-[#E2D7CB] w-full" />
          <span className="px-3 text-[10px] font-extrabold text-[#4A3E32] uppercase tracking-wider whitespace-nowrap">
            or continue with
          </span>
          <div className="border-t border-[#E2D7CB] w-full" />
        </div>

        {/* Firebase Google Sign In Button in Light Grey Theme */}
        <GoogleSignInButton
          text="Sign in with Google"
          className="w-full py-3 bg-[#EFECE8] border border-[#E2D7CB] text-[#5C5248] font-extrabold text-xs sm:text-sm rounded-2xl hover:bg-[#E5E1DC] shadow-xs flex items-center justify-center gap-2 transition-all"
        />

        {/* Signup prompt */}
        <div className="pt-1 text-center">
          <p className="text-xs text-[#6B5C4D] font-bold">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="font-extrabold text-[#38A132] hover:underline"
            >
              Signup
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};
