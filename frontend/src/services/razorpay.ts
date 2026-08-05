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
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    onFailure('Failed to load Razorpay SDK script. Please check your network connection.');
    return false;
  }

  try {
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amount > 100000000 ? amount : Math.round(amount), // ensure in paise
      currency: 'INR',
      name: name || 'RetailSphere Luxury Furniture',
      description: description || 'Furniture Order Payment',
      order_id: orderId,
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=80',
      prefill: prefill || {
        name: 'Valued Customer',
        email: 'customer@retailsphere.com',
        contact: '9876543210',
      },
      theme: {
        color: '#48A63E',
      },
      handler: (response: RazorpaySuccessResponse) => {
        // Only path that should ever mark an order as paid.
        if (response && response.razorpay_payment_id) {
          onSuccess(response.razorpay_payment_id);
        } else {
          onFailure('No payment ID returned from Razorpay.');
        }
      },
      modal: {
        ondismiss: () => {
          // User closed the popup without paying — order stays unpaid.
          onFailure('Payment popup closed before completion.');
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);

    rzp.on('payment.failed', (response: any) => {
      // Card declined, international restriction, etc.
      onFailure(response.error?.description || 'Payment failed.');
    });

    rzp.open();
    return true;
  } catch (err: any) {
    console.error('Razorpay checkout initialization error:', err);
    onFailure(err?.message || 'Failed to initialize payment gateway.');
    return false;
  }
}
