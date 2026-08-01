import React from 'react';
import { HeaderNav } from '../landing/HeaderNav';
import { SignupForm } from './SignupForm';

export const SignupPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden text-[#2C241D] selection:bg-[#48A63E] selection:text-white">
      {/* High Resolution Ambient Warm Living Room Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 scale-105 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
        aria-hidden="true"
      />

      {/* Warm Cream Luxury Gradient Overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* Ambient Glass Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#48A63E]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Navigation */}
      <div className="relative z-20">
        <HeaderNav />
      </div>

      {/* Centered Compact Glassmorphic Signup Card (Zero Scroll Fit) */}
      <main className="relative z-10 flex-1 flex items-center justify-center my-2 px-4 py-4">
        <div className="w-full max-w-[380px] sm:max-w-[440px] ultra-glass-panel rounded-[2rem] p-5 sm:p-6 shadow-2xl transition-all duration-300 relative">
          <SignupForm />
        </div>
      </main>

      {/* Footer spacer */}
      <footer className="relative z-10 text-center py-1" />
    </div>
  );
};
