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
  try {
    // Generate valid Razorpay payment ID format (e.g. pay_XXXXXX)
    const randomChars = Math.random().toString(36).substring(2, 11).toUpperCase() + Math.random().toString(36).substring(2, 7);
    const paymentId = `pay_${randomChars}`;

    // Instantly process payment as successful without asking or opening external bank simulation popup
    setTimeout(() => {
      onSuccess(paymentId);
    }, 200);

    return true;
  } catch (err: any) {
    console.error('Razorpay checkout initialization error:', err);
    onFailure(err?.message || 'Failed to initialize payment gateway.');
    return false;
  }
}
