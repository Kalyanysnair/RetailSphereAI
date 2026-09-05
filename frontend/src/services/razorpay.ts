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
  name = 'RetailSphere AI',
  description = 'Furniture & Services Payment',
  prefill,
  onSuccess,
  onFailure,
}: RazorpayCheckoutParams): Promise<boolean> {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      onFailure('Failed to load Razorpay SDK. Please check your network connection.');
      return false;
    }

    return new Promise((resolve) => {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(amount), // in paise
        currency: 'INR',
        name: name,
        description: description,
        image: 'https://cdn-icons-png.flaticon.com/512/3037/3037060.png',
        order_id: orderId || undefined,
        prefill: {
          name: prefill?.name || 'Valued Customer',
          email: prefill?.email || 'customer@retailsphere.com',
          contact: prefill?.contact || '9876543210',
        },
        notes: {
          platform: 'RetailSphere AI Commerce Platform',
          mode: 'Test Payment Mode'
        },
        theme: {
          color: '#38A132',
        },
        modal: {
          ondismiss: function () {
            onFailure('Payment cancelled by customer.');
            resolve(false);
          },
        },
        handler: function (response: RazorpaySuccessResponse) {
          if (response && response.razorpay_payment_id) {
            onSuccess(response.razorpay_payment_id);
            resolve(true);
          } else {
            const fallbackId = `pay_test_${Date.now()}`;
            onSuccess(fallbackId);
            resolve(true);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        const errMsg = response.error?.description || response.error?.reason || 'Payment transaction failed.';
        onFailure(errMsg);
        resolve(false);
      });
      rzp.open();
    });
  } catch (err: any) {
    onFailure(err?.message || 'Payment initialization error.');
    return false;
  }
}
