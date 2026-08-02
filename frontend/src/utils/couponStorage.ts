export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  targetUserEmail?: string;
}

export interface CustomerNotification {
  id: string;
  targetUserEmail: string;
  couponCode: string;
  discountPercent: number;
  message: string;
  createdDate: string;
  read: boolean;
}

const COUPONS_STORAGE_KEY = 'retailsphere_coupons_v1';
const CUSTOMER_NOTIFS_KEY = 'retailsphere_customer_notifications_v1';

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'DEAREST10',
    discountPercent: 10,
    description: 'Dearest Customer 10% Off Discount',
    status: 'Active',
    createdDate: '2026-08-01',
  },
  {
    id: 'c-2',
    code: 'VIP20',
    discountPercent: 20,
    description: 'Premium VIP Customer 20% Off Discount',
    status: 'Active',
    createdDate: '2026-08-01',
  },
  {
    id: 'c-3',
    code: 'LOYAL15',
    discountPercent: 15,
    description: 'Loyal Member 15% Off Discount',
    status: 'Active',
    createdDate: '2026-08-01',
  },
  {
    id: 'c-4',
    code: 'WELCOME5',
    discountPercent: 5,
    description: 'Welcome Customer 5% Off Discount',
    status: 'Active',
    createdDate: '2026-08-01',
  },
];

export const getStoredCoupons = (): Coupon[] => {
  try {
    const raw = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(DEFAULT_COUPONS));
      return DEFAULT_COUPONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading coupons from localStorage:', err);
    return DEFAULT_COUPONS;
  }
};

export const addStoredCoupon = (newCouponData: {
  code: string;
  discountPercent: number;
  description: string;
  targetUserEmail?: string;
}): Coupon[] => {
  const current = getStoredCoupons();
  const cleanCode = newCouponData.code.trim().toUpperCase();

  // Check if code already exists
  const existingIdx = current.findIndex(c => c.code === cleanCode);

  const newCoupon: Coupon = {
    id: `c-${Date.now()}`,
    code: cleanCode,
    discountPercent: Math.min(100, Math.max(1, newCouponData.discountPercent)),
    description: newCouponData.description.trim() || `${newCouponData.discountPercent}% Off Discount Coupon`,
    status: 'Active',
    createdDate: new Date().toISOString().split('T')[0],
    targetUserEmail: newCouponData.targetUserEmail?.trim() || undefined,
  };

  let updated: Coupon[];
  if (existingIdx >= 0) {
    current[existingIdx] = newCoupon;
    updated = [...current];
  } else {
    updated = [newCoupon, ...current];
  }

  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('coupons-updated'));

  // If a target email or user ID is provided, dispatch a notification
  if (newCouponData.targetUserEmail?.trim()) {
    dispatchCustomerNotification({
      targetUserEmail: newCouponData.targetUserEmail.trim(),
      couponCode: cleanCode,
      discountPercent: newCoupon.discountPercent,
    });
  }

  return updated;
};

export const removeStoredCoupon = (idOrCode: string): Coupon[] => {
  const current = getStoredCoupons();
  const updated = current.filter(
    c => c.id !== idOrCode && c.code.toLowerCase() !== idOrCode.toLowerCase()
  );
  localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('coupons-updated'));
  return updated;
};

export const validateStoredCoupon = (code: string): { valid: boolean; coupon?: Coupon; message?: string } => {
  const cleanCode = code.trim().toUpperCase();
  const coupons = getStoredCoupons();
  const found = coupons.find(c => c.code === cleanCode && c.status === 'Active');

  if (found) {
    return { valid: true, coupon: found, message: `${found.description} (${found.discountPercent}% Off) Applied!` };
  }
  return { valid: false, message: `Invalid or expired coupon code "${code}".` };
};

export const getCustomerNotifications = (userEmailOrId?: string): CustomerNotification[] => {
  try {
    const raw = localStorage.getItem(CUSTOMER_NOTIFS_KEY);
    if (!raw) return [];
    const all: CustomerNotification[] = JSON.parse(raw);
    if (!userEmailOrId) return all;
    const clean = userEmailOrId.trim().toLowerCase();
    return all.filter(n => !n.targetUserEmail || n.targetUserEmail.trim().toLowerCase() === clean);
  } catch (err) {
    return [];
  }
};

export const dispatchCustomerNotification = (notifData: {
  targetUserEmail: string;
  couponCode: string;
  discountPercent: number;
}) => {
  try {
    const existing = getCustomerNotifications();
    const newNotif: CustomerNotification = {
      id: `cn-${Date.now()}`,
      targetUserEmail: notifData.targetUserEmail.trim(),
      couponCode: notifData.couponCode.trim().toUpperCase(),
      discountPercent: notifData.discountPercent,
      message: `🎉 Exclusive ${notifData.discountPercent}% Discount Coupon Received! Use promo code ${notifData.couponCode.toUpperCase()} at checkout.`,
      createdDate: new Date().toLocaleString('en-IN'),
      read: false,
    };
    const updated = [newNotif, ...existing];
    localStorage.setItem(CUSTOMER_NOTIFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('customer-notifications-updated'));
  } catch (err) {
    console.warn('Could not dispatch customer notification:', err);
  }
};
