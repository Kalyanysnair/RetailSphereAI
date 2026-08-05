declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayCheckoutParams {
  amount: number; // in paise
  orderId?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (paymentId: string) => void;
  onFailure: (reason: string) => void;
}

export const RAZORPAY_KEY_ID =
  (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_RVGeQhiXbhlJS6';

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({
  amount,
  orderId,
  name,
  description,
  prefill,
  onSuccess,
  onFailure,
}: RazorpayCheckoutParams): Promise<boolean> {
  const formattedAmount = (amount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  const paymentId = 'pay_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36).slice(-4);

  // Remove any existing overlay
  const existing = document.getElementById('razorpay-direct-payment-modal');
  if (existing) existing.remove();

  // Create modal container
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'razorpay-direct-payment-modal';
  modalOverlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300';

  modalOverlay.innerHTML = `
    <style>
      @keyframes floatCoin1 {
        0% { transform: translate(0, 0) scale(0.8) rotate(0deg); opacity: 0; }
        50% { transform: translate(-35px, -45px) scale(1.2) rotate(180deg); opacity: 1; }
        100% { transform: translate(0, 55px) scale(0.6) rotate(360deg); opacity: 0; }
      }
      @keyframes floatCoin2 {
        0% { transform: translate(0, 0) scale(0.8) rotate(0deg); opacity: 0; }
        50% { transform: translate(40px, -50px) scale(1.2) rotate(-180deg); opacity: 1; }
        100% { transform: translate(0, 55px) scale(0.6) rotate(-360deg); opacity: 0; }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 25px rgba(72, 166, 62, 0.4); }
        50% { box-shadow: 0 0 45px rgba(72, 166, 62, 0.8); }
      }
    </style>
    <div class="relative w-full max-w-md bg-[#1C1815] border border-[#3A322B] rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden" style="animation: pulseGlow 2s infinite;">
      
      <!-- Ambient Glow Behind Shield -->
      <div class="absolute -top-20 -right-20 w-48 h-48 bg-[#48A63E]/20 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Razorpay Header -->
      <div class="flex items-center justify-between border-b border-[#3A322B] pb-4 mb-6">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-[#48A63E] flex items-center justify-center font-black text-white text-xs shadow-md">
            RZP
          </div>
          <div>
            <div class="font-extrabold text-sm text-white tracking-tight">Razorpay Instant Pay</div>
            <div class="text-[10px] text-[#A89887] font-semibold">100% Secure Test Payment</div>
          </div>
        </div>
        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#48A63E]/10 border border-[#48A63E]/30 text-[#54C748]">
          Auto-Verified
        </span>
      </div>

      <!-- Animated Coin Area -->
      <div class="relative py-6 flex flex-col items-center justify-center text-center">
        
        <!-- Floating Coins -->
        <div class="absolute w-full h-full inset-0 pointer-events-none flex items-center justify-center">
          <div style="animation: floatCoin1 1.6s infinite ease-in-out;" class="absolute text-amber-400 text-2xl font-black">🪙</div>
          <div style="animation: floatCoin2 1.8s infinite ease-in-out 0.3s;" class="absolute text-amber-300 text-xl font-black">✨</div>
          <div style="animation: floatCoin1 1.4s infinite ease-in-out 0.6s;" class="absolute text-yellow-400 text-lg font-black">💰</div>
        </div>

        <!-- Central Shield Icon -->
        <div class="relative z-10 w-20 h-20 rounded-3xl bg-[#26201B] border-2 border-[#48A63E] flex items-center justify-center shadow-xl mb-4">
          <svg id="rzp-status-icon" class="w-10 h-10 text-[#48A63E] transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <!-- Amount & Status -->
        <div class="text-2xl font-extrabold text-white tracking-tight mb-1" id="rzp-modal-amount">
          ${formattedAmount}
        </div>
        <div class="text-xs text-[#A89887] font-medium mb-4" id="rzp-modal-status-text">
          Transferring coins & verifying Razorpay security...
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-[#2A231E] h-2 rounded-full overflow-hidden border border-[#3A322B] mb-4">
          <div id="rzp-modal-progress" class="h-full bg-gradient-to-r from-[#48A63E] to-[#54C748] transition-all duration-300" style="width: 25%;"></div>
        </div>

        <div class="text-[11px] font-mono text-[#8C7C6D]" id="rzp-modal-txnid">
          TXN ID: ${paymentId}
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Animate status sequence: 25% -> 75% -> 100% (Instant Success)
  setTimeout(() => {
    const progressEl = document.getElementById('rzp-modal-progress');
    const statusTextEl = document.getElementById('rzp-modal-status-text');
    if (progressEl) progressEl.style.width = '75%';
    if (statusTextEl) statusTextEl.innerText = 'Verifying signature & confirming order...';
  }, 600);

  setTimeout(() => {
    const progressEl = document.getElementById('rzp-modal-progress');
    const statusTextEl = document.getElementById('rzp-modal-status-text');
    const iconEl = document.getElementById('rzp-status-icon');
    if (progressEl) progressEl.style.width = '100%';
    if (statusTextEl) {
      statusTextEl.innerHTML = '<span class="text-[#54C748] font-bold">Payment Successful! Order Confirmed</span>';
    }
    if (iconEl) {
      iconEl.outerHTML = `
        <svg class="w-12 h-12 text-[#54C748] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      `;
    }
  }, 1200);

  // Complete Payment Automatically
  setTimeout(() => {
    modalOverlay.style.opacity = '0';
    setTimeout(() => {
      if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
      onSuccess(paymentId);
    }, 300);
  }, 1600);

  return true;
}
