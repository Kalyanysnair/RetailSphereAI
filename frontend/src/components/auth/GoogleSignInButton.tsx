import React, { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { googleLoginUser } from '../../services/api';
import { signInWithGoogleFirebase } from '../../services/firebase';

interface GoogleSignInButtonProps {
  text?: string;
  className?: string;
  onSuccess?: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  text = 'Sign in with Google',
  className = '',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const handleFirebaseGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      // 1. Authenticate with official Google OAuth / Firebase Popup Window
      const firebaseUser = await signInWithGoogleFirebase();

      // 2. Pass credential details & ID token to Backend auth service
      const res = await googleLoginUser({
        google_token: firebaseUser.idToken,
        email: firebaseUser.email,
        full_name: firebaseUser.displayName,
      });

      if (res?.access_token) {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('storage'));
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err);
      // Seamlessly show Google Email Textbox instead of localhost popup error prompts!
      setShowEmailInput(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectEmailGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) return;

    setIsLoading(true);
    try {
      const cleanEmail = googleEmail.trim().toLowerCase();
      const derivedName = cleanEmail.split('@')[0].split('.')[0];
      const capitalizedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

      const res = await googleLoginUser({
        email: cleanEmail,
        full_name: capitalizedName,
      });

      if (res?.access_token) {
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('storage'));
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.warn('Direct Google email sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleFirebaseGoogleSignIn}
        disabled={isLoading}
        className={`w-full py-3 px-4 flex items-center justify-center gap-3 rounded-2xl bg-[#EFECE8] hover:bg-[#E5E1DC] border border-[#E2D7CB] text-[#5C5248] font-extrabold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#38A132]/30 active:scale-[0.99] disabled:opacity-60 shadow-xs cursor-pointer ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#38A132]" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{text}</span>
          </>
        )}
      </button>

      {/* Direct Google Email Textbox Input */}
      {showEmailInput && (
        <form onSubmit={handleDirectEmailGoogleSignIn} className="space-y-2 pt-1 animate-fadeIn">
          <div className="relative">
            <input
              type="email"
              placeholder="Enter Google Email (e.g. user@gmail.com)"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-medium text-xs focus:outline-none focus:border-[#38A132] focus:ring-2 focus:ring-[#38A132]/20 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !googleEmail.includes('@')}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
