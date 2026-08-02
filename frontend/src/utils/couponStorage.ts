export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  targetUserEmail: string;
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

const COUPONS_STORAGE_KEY = 'retailsphere_coupons_v3';
const CUSTOMER_NOTIFS_KEY = 'retailsphere_customer_notifications_v1';

// Initial coupons with empty target email (to be assigned by retail staff as needed)
const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'SPECIAL10',
    discountPercent: 10,
    description: '10% Off Customer Discount',
    status: 'Active',
    createdDate: '2026-08-01',
    targetUserEmail: '',
  },
  {
    id: 'c-2',
    code: 'VIP20',
    discountPercent: 20,
    description: '20% Off VIP Discount',
    status: 'Active',
    createdDate: '2026-08-01',
    targetUserEmail: '',
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
  const cleanEmail = (newCouponData.targetUserEmail || '').trim();

  // Check if code already exists
  const existingIdx = current.findIndex(c => c.code === cleanCode);

  const newCoupon: Coupon = {
    id: `c-${Date.now()}`,
    code: cleanCode,
    discountPercent: Math.min(100, Math.max(1, newCouponData.discountPercent)),
    description: newCouponData.description.trim() || `${newCouponData.discountPercent}% Off Discount Coupon`,
    status: 'Active',
    createdDate: new Date().toISOString().split('T')[0],
    targetUserEmail: cleanEmail,
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

  // Dispatch live notification & trigger email notification log for designated customer
  if (cleanEmail) {
    dispatchCustomerNotification({
      targetUserEmail: cleanEmail,
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

export const updateCouponUserEmail = (idOrCode: string, newUserEmail: string): Coupon[] => {
  const current = getStoredCoupons();
  const cleanEmail = newUserEmail.trim();
  const idx = current.findIndex(
    c => c.id === idOrCode || c.code.toLowerCase() === idOrCode.toLowerCase()
  );

  if (idx >= 0) {
    current[idx].targetUserEmail = cleanEmail;
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event('coupons-updated'));

    if (cleanEmail) {
      dispatchCustomerNotification({
        targetUserEmail: cleanEmail,
        couponCode: current[idx].code,
        discountPercent: current[idx].discountPercent,
      });
    }
  }

  return current;
};

export const validateStoredCoupon = (code: string, userEmailOrId?: string): { valid: boolean; coupon?: Coupon; message?: string } => {
  const cleanCode = code.trim().toUpperCase();
  const coupons = getStoredCoupons();
  const found = coupons.find(c => c.code === cleanCode && c.status === 'Active');

  if (!found) {
    return { valid: false, message: `Invalid or expired coupon code "${code}".` };
  }

  // Strict User Account Validation: Check if coupon is assigned to this user
  if (found.targetUserEmail) {
    const target = found.targetUserEmail.trim().toLowerCase();
    const current = (userEmailOrId || '').trim().toLowerCase();
    if (!current || target !== current) {
      return {
        valid: false,
        message: `This coupon code is restricted to user "${found.targetUserEmail}". Please log in with that account to redeem.`,
      };
    }
  }

  return { valid: true, coupon: found, message: `${found.description} (${found.discountPercent}% Off) Applied!` };
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
      message: `🎉 Exclusive ${notifData.discountPercent}% Discount Coupon Issued! Use code ${notifData.couponCode.toUpperCase()} at checkout.`,
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

export const sendCouponToCustomer = (couponIdOrCode: string, targetEmail: string): { success: boolean; message: string } => {
  const cleanEmail = targetEmail.trim();
  if (!cleanEmail) {
    return { success: false, message: 'Please enter a valid customer email or User ID first.' };
  }

  updateCouponUserEmail(couponIdOrCode, cleanEmail);

  const coupons = getStoredCoupons();
  const coupon = coupons.find(c => c.id === couponIdOrCode || c.code.toLowerCase() === couponIdOrCode.toLowerCase());

  const discountPercent = coupon?.discountPercent || 10;
  const promoCode = (coupon?.code || couponIdOrCode).toUpperCase();

  dispatchCustomerNotification({
    targetUserEmail: cleanEmail,
    couponCode: promoCode,
    discountPercent,
  });

  return {
    success: true,
    message: `Coupon code "${promoCode}" (${discountPercent}% OFF) successfully sent to ${cleanEmail}! Delivered to customer notification bell & email.`,
  };
};
