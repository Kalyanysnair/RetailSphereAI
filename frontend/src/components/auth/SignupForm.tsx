import React, { useState } from 'react';
import { User, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SignupCredentials, SignupValidationErrors, SignupFormProps } from '../../types/auth';

export const SignupForm: React.FC<SignupFormProps> = ({ onSubmit, isLoading = false }) => {
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState<SignupCredentials>({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<SignupValidationErrors>({});
  const [internalLoading, setInternalLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: SignupValidationErrors = {};

    if (!credentials.username.trim()) {
      newErrors.username = 'User Name is required';
    }

    if (!credentials.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!credentials.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{7,15}$/.test(credentials.phone.trim().replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!credentials.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setInternalLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(credentials);
      } else {
        const { signupUser } = await import('../../services/api');
        await signupUser({
          full_name: credentials.username,
          email: credentials.email,
          phone: credentials.phone.trim(),
          password: credentials.password
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      setErrors({ general: msg });
      
      if (msg.toLowerCase().includes('failed to fetch')) {
        console.warn('Backend server offline. Continuing in local demo mode.');
        navigate('/dashboard');
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof SignupValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const isSubmitting = isLoading || internalLoading;

  return (
    <div className="w-full animate-fadeIn space-y-3.5 text-[#2C241D]">
      {/* Brand Header Inside Card */}
      <div className="text-left space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-1.5 drop-shadow-xs">
          <span>RetailSphere</span>
          <span className="text-[#38A132]">AI</span>
        </h1>
        <p className="text-[11px] text-[#6B5C4D] font-extrabold">
          Create your account to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 w-full" noValidate>
        {errors.general && (
          <div className="p-2.5 text-[11px] text-rose-800 bg-rose-50 border border-rose-300 rounded-xl font-bold">
            {errors.general}
          </div>
        )}

        {/* User Name Input Box with Spacious Padding */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
            User Name / Full Name
          </label>
          <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
            <input
              type="text"
              name="username"
              placeholder="e.g. Rahul Sharma"
              value={credentials.username}
              onChange={handleChange}
              autoComplete="username"
              required
              className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
            />
            <div className="pr-3.5 text-[#38A132] pointer-events-none">
              <User className="w-4 h-4" />
            </div>
          </div>
          {errors.username && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.username}</p>
          )}
        </div>

        {/* Email Address Input Box with Spacious Padding */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
            Email Address
          </label>
          <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
            <input
              type="email"
              name="email"
              placeholder="name@retailsphere.ai"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="email"
              required
              className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
            />
            <div className="pr-3.5 text-[#38A132] pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          {errors.email && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.email}</p>
          )}
        </div>

        {/* Phone Number Input Box with Spacious Padding */}
        <div>
          <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
            Phone Number
          </label>
          <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
            <input
              type="tel"
              name="phone"
              placeholder="+91 9778237180"
              value={credentials.phone}
              onChange={handleChange}
              autoComplete="tel"
              required
              className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
            />
            <div className="pr-3.5 text-[#38A132] pointer-events-none">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          {errors.phone && (
            <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.phone}</p>
          )}
        </div>

        {/* Password & Confirm Password Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
              Password
            </label>
            <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full py-2.5 px-3.5 text-xs text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3 text-[#5C4E42] hover:text-[#2C241D] focus:outline-none transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[#6B5C4D] mb-1">
              Confirm Password
            </label>
            <div className="relative flex items-center bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl overflow-hidden focus-within:border-[#38A132] focus-within:ring-2 focus-within:ring-[#38A132]/20 transition-all shadow-xs">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm"
                value={credentials.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
                className="w-full py-2.5 px-3.5 text-xs text-[#2C241D] font-bold placeholder-[#9E9082] bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="pr-3 text-[#5C4E42] hover:text-[#2C241D] focus:outline-none transition-colors"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-0.5 text-[10px] font-bold text-rose-700">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#38A132]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
        >
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
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
          text="Sign up with Google"
          className="w-full py-3 bg-[#EFECE8] border border-[#E2D7CB] text-[#5C5248] font-extrabold text-xs sm:text-sm rounded-2xl hover:bg-[#E5E1DC] shadow-xs flex items-center justify-center gap-2 transition-all"
        />

        {/* Login link */}
        <div className="pt-1 text-center">
          <p className="text-[11px] text-[#6B5C4D] font-bold">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-extrabold text-[#38A132] hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};
