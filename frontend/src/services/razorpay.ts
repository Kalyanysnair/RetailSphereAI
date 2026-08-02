declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RAZORPAY_KEY_ID = 'rzp_test_RVGeQhiXbhlJS6';

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

export interface RazorpayOptions {
  amount: number; // in INR rupees
  name?: string;
  description?: string;
  orderId?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (paymentId: string) => void;
  onFailure?: (error: any) => void;
}

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<boolean> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    alert('Failed to load Razorpay payment gateway. Please check your internet connection.');
    return false;
  }

  const razorpayConfig = {
    key: RAZORPAY_KEY_ID,
    amount: Math.round(options.amount * 100), // Razorpay accepts amount in paise
    currency: 'INR',
    name: options.name || 'RetailSphere Luxury Furniture',
    description: options.description || 'Furniture Order Payment',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=80',
    prefill: {
      name: options.prefill?.name || 'Valued Customer',
      email: options.prefill?.email || 'customer@retailsphere.com',
      contact: options.prefill?.contact || '9876543210',
    },
    theme: {
      color: '#38A132',
    },
    handler: function (response: any) {
      if (response && response.razorpay_payment_id) {
        options.onSuccess(response.razorpay_payment_id);
      }
    },
    modal: {
      ondismiss: function () {
        // Fallback for Test Mode if Razorpay popup is closed or encounters card restrictions
        const confirmSimulated = window.confirm(
          "Complete this test order now? Click OK to approve simulated payment."
        );
        if (confirmSimulated) {
          const mockPaymentId = `pay_sim_${Date.now().toString().slice(-8)}`;
          options.onSuccess(mockPaymentId);
        } else if (options.onFailure) {
          options.onFailure({ message: 'Payment cancelled by user' });
        }
      },
    },
  };

  const paymentWindow = new window.Razorpay(razorpayConfig);
  paymentWindow.open();
  return true;
}
