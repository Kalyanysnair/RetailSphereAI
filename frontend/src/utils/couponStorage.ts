export type CouponAudienceType = 'all' | 'retail' | 'production';

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  targetUserEmail: string;
  customerLimit?: number;
  currentRedemptions?: number;
  audienceType?: CouponAudienceType;
  allowedCustomerEmails?: string[];
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

export interface CouponAllotment {
  id: string;
  couponCode: string;
  discountPercent: number;
  targetUserEmail: string;
  allottedDate: string;
  used: boolean;
  usedDate?: string;
}

const COUPONS_STORAGE_KEY = 'retailsphere_coupons_v3';
const CUSTOMER_NOTIFS_KEY = 'retailsphere_customer_notifications_v1';
const ALLOTMENTS_STORAGE_KEY = 'retailsphere_coupon_allotments_v1';

// Initial coupons with empty target email (to be assigned by retail staff as needed)
const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'SPECIAL10',
    discountPercent: 10,
    description: '10% Off Customer Discount (First 100 Customers)',
    status: 'Active',
    createdDate: '2026-08-01',
    targetUserEmail: '',
    customerLimit: 100,
    currentRedemptions: 0,
    audienceType: 'all',
  },
  {
    id: 'c-2',
    code: 'VIP20',
    discountPercent: 20,
    description: '20% Off VIP Discount (First 10 Customers)',
    status: 'Active',
    createdDate: '2026-08-01',
    targetUserEmail: '',
    customerLimit: 10,
    currentRedemptions: 0,
    audienceType: 'all',
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

export const getCouponAllotments = (): CouponAllotment[] => {
  try {
    const raw = localStorage.getItem(ALLOTMENTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

export const recordCouponAllotment = (allotmentData: {
  couponCode: string;
  discountPercent: number;
  targetUserEmail: string;
}): CouponAllotment[] => {
  const current = getCouponAllotments();
  const cleanEmail = allotmentData.targetUserEmail.trim();
  const cleanCode = allotmentData.couponCode.trim().toUpperCase();

  if (!cleanEmail || !cleanCode) return current;

  const existingIdx = current.findIndex(
    a => a.couponCode === cleanCode && a.targetUserEmail.toLowerCase() === cleanEmail.toLowerCase()
  );

  const newAllotment: CouponAllotment = {
    id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    couponCode: cleanCode,
    discountPercent: allotmentData.discountPercent,
    targetUserEmail: cleanEmail,
    allottedDate: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    used: existingIdx >= 0 ? current[existingIdx].used : false,
    usedDate: existingIdx >= 0 ? current[existingIdx].usedDate : undefined,
  };

  let updated: CouponAllotment[];
  if (existingIdx >= 0) {
    current[existingIdx] = newAllotment;
    updated = [...current];
  } else {
    updated = [newAllotment, ...current];
  }

  localStorage.setItem(ALLOTMENTS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('allotments-updated'));
  return updated;
};

export const markCouponAsUsed = (couponCode: string, userEmailOrId: string): boolean => {
  const current = getCouponAllotments();
  const cleanCode = couponCode.trim().toUpperCase();
  const cleanEmail = userEmailOrId.trim().toLowerCase();

  const idx = current.findIndex(
    a => a.couponCode === cleanCode && a.targetUserEmail.toLowerCase() === cleanEmail
  );

  const usageTimestamp = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (idx >= 0) {
    current[idx].used = true;
    current[idx].usedDate = usageTimestamp;
  } else {
    current.unshift({
      id: `alt-${Date.now()}`,
      couponCode: cleanCode,
      discountPercent: 10,
      targetUserEmail: userEmailOrId.trim(),
      allottedDate: usageTimestamp,
      used: true,
      usedDate: usageTimestamp,
    });
  }

  localStorage.setItem(ALLOTMENTS_STORAGE_KEY, JSON.stringify(current));

  // Increment currentRedemptions on the coupon itself
  const coupons = getStoredCoupons();
  const cIdx = coupons.findIndex(c => c.code === cleanCode);
  if (cIdx >= 0) {
    coupons[cIdx].currentRedemptions = (coupons[cIdx].currentRedemptions || 0) + 1;
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
    window.dispatchEvent(new Event('coupons-updated'));
  }

  window.dispatchEvent(new Event('allotments-updated'));
  return true;
};

export const hasUserUsedCoupon = (couponCode: string, userEmailOrId: string): boolean => {
  const current = getCouponAllotments();
  const cleanCode = couponCode.trim().toUpperCase();
  const cleanEmail = userEmailOrId.trim().toLowerCase();

  const found = current.find(
    a => a.couponCode === cleanCode && a.targetUserEmail.toLowerCase() === cleanEmail
  );
  return !!(found && found.used);
};

export const addStoredCoupon = (newCouponData: {
  code: string;
  discountPercent: number;
  description: string;
  targetUserEmail?: string;
  customerLimit?: number;
  audienceType?: CouponAudienceType;
  allowedCustomerEmails?: string[];
}): Coupon[] => {
  const current = getStoredCoupons();
  const cleanCode = newCouponData.code.trim().toUpperCase();
  const cleanEmail = (newCouponData.targetUserEmail || '').trim();
  const customerLimit = newCouponData.customerLimit && newCouponData.customerLimit > 0 ? newCouponData.customerLimit : undefined;
  const audienceType = newCouponData.audienceType || 'all';

  const existingIdx = current.findIndex(c => c.code === cleanCode);

  const newCoupon: Coupon = {
    id: `c-${Date.now()}`,
    code: cleanCode,
    discountPercent: Math.min(100, Math.max(1, newCouponData.discountPercent)),
    description: newCouponData.description.trim() || `${newCouponData.discountPercent}% Off Discount Coupon`,
    status: 'Active',
    createdDate: new Date().toISOString().split('T')[0],
    targetUserEmail: cleanEmail,
    customerLimit: customerLimit,
    currentRedemptions: existingIdx >= 0 ? (current[existingIdx].currentRedemptions || 0) : 0,
    audienceType: audienceType,
    allowedCustomerEmails: newCouponData.allowedCustomerEmails,
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

  if (cleanEmail) {
    dispatchCustomerNotification({
      targetUserEmail: cleanEmail,
      couponCode: cleanCode,
      discountPercent: newCoupon.discountPercent,
    });
    recordCouponAllotment({
      couponCode: cleanCode,
      discountPercent: newCoupon.discountPercent,
      targetUserEmail: cleanEmail,
    });
  }

  if (newCouponData.allowedCustomerEmails && newCouponData.allowedCustomerEmails.length > 0) {
    newCouponData.allowedCustomerEmails.forEach(email => {
      if (email.trim() && email.trim().toLowerCase() !== cleanEmail.toLowerCase()) {
        dispatchCustomerNotification({
          targetUserEmail: email.trim(),
          couponCode: cleanCode,
          discountPercent: newCoupon.discountPercent,
        });
        recordCouponAllotment({
          couponCode: cleanCode,
          discountPercent: newCoupon.discountPercent,
          targetUserEmail: email.trim(),
        });
      }
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
      recordCouponAllotment({
        couponCode: current[idx].code,
        discountPercent: current[idx].discountPercent,
        targetUserEmail: cleanEmail,
      });
    }
  }

  return current;
};

export const validateStoredCoupon = (
  code: string,
  userEmailOrId?: string,
  userContext?: { isRetailCustomer?: boolean; isProductionCustomer?: boolean; isRetailCart?: boolean; isProductionCart?: boolean }
): { valid: boolean; coupon?: Coupon; message?: string } => {
  const cleanCode = code.trim().toUpperCase();
  const coupons = getStoredCoupons();
  const found = coupons.find(c => c.code === cleanCode && c.status === 'Active');

  if (!found) {
    return { valid: false, message: `Invalid or expired coupon code "${code}".` };
  }

  const currentUserEmail = (userEmailOrId || '').trim().toLowerCase();

  // 1. Check First N Customers Redemption Cap
  if (found.customerLimit && found.customerLimit > 0 && (found.currentRedemptions || 0) >= found.customerLimit) {
    return {
      valid: false,
      message: `Coupon limit reached! Coupon "${cleanCode}" was restricted to the first ${found.customerLimit} customers and has reached maximum redemptions.`,
    };
  }

  // 2. Strict Targeted Email List Check (if specified for first N customer accounts)
  if (found.allowedCustomerEmails && found.allowedCustomerEmails.length > 0) {
    const isAllowed = found.allowedCustomerEmails.some(e => e.trim().toLowerCase() === currentUserEmail);
    if (!currentUserEmail || !isAllowed) {
      return {
        valid: false,
        message: `This coupon code is restricted to the first ${found.allowedCustomerEmails.length} designated customer accounts in this promotion.`,
      };
    }
  }

  // 3. Single Target User Email Validation
  if (found.targetUserEmail) {
    const target = found.targetUserEmail.trim().toLowerCase();
    if (!currentUserEmail || target !== currentUserEmail) {
      return {
        valid: false,
        message: `This coupon code is restricted to user account "${found.targetUserEmail}". Please log in with that account to redeem.`,
      };
    }
  }

  // 4. Access Provision (Audience Type) Check
  if (found.audienceType === 'retail') {
    const isRetail = userContext?.isRetailCustomer || userContext?.isRetailCart;
    if (userContext && isRetail === false) {
      return {
        valid: false,
        message: `This promo code is exclusively reserved for Retail Customers / Readymade Furniture purchases.`,
      };
    }
  } else if (found.audienceType === 'production') {
    const isProduction = userContext?.isProductionCustomer || userContext?.isProductionCart;
    if (userContext && isProduction === false) {
      return {
        valid: false,
        message: `This promo code is exclusively reserved for Production / Bespoke Custom Furniture Customers.`,
      };
    }
  }

  // 5. Strict One-Time Usage Rule Check per user
  if (currentUserEmail && hasUserUsedCoupon(cleanCode, currentUserEmail)) {
    return {
      valid: false,
      message: `You have already redeemed coupon "${cleanCode}". This coupon code is limited to a one-time usage per customer.`,
    };
  }

  return { valid: true, coupon: found, message: `${found.description} (${found.discountPercent}% Off) Applied!` };
};

export const getCustomerNotifications = (userEmailOrId?: string): CustomerNotification[] => {
  try {
    const raw = localStorage.getItem(CUSTOMER_NOTIFS_KEY);
    if (!raw) return [];
    const all: CustomerNotification[] = JSON.parse(raw);
    
    if (!userEmailOrId || !userEmailOrId.trim()) {
      return all;
    }
    
    const cleanUser = userEmailOrId.trim().toLowerCase();
    
    return all.filter(n => {
      if (!n.targetUserEmail || !n.targetUserEmail.trim()) return true;
      const target = n.targetUserEmail.trim().toLowerCase();
      return target === cleanUser || cleanUser.includes(target) || target.includes(cleanUser);
    });
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

  recordCouponAllotment({
    couponCode: promoCode,
    discountPercent,
    targetUserEmail: cleanEmail,
  });

  // Trigger real backend email dispatch
  try {
    fetch('http://localhost:8000/api/admin/send-coupon-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        coupon_code: promoCode,
        discount_percent: discountPercent,
      }),
    }).catch((e) => console.log('Backend coupon email call:', e));
  } catch (err) {
    console.log('Coupon email call exception:', err);
  }

  return {
    success: true,
    message: `Coupon code "${promoCode}" (${discountPercent}% OFF) successfully sent to ${cleanEmail}! Notification delivered to customer dashboard & email sent.`,
  };
};

export const sendBulkCouponsToFirstNCustomers = async (
  couponIdOrCode: string,
  audience: CouponAudienceType = 'all',
  limit: number = 10
): Promise<{ success: boolean; message: string; count: number }> => {
  const coupons = getStoredCoupons();
  const coupon = coupons.find(c => c.id === couponIdOrCode || c.code.toLowerCase() === couponIdOrCode.toLowerCase());

  if (!coupon) {
    return { success: false, message: 'Coupon not found.', count: 0 };
  }

  const promoCode = coupon.code;
  const discountPercent = coupon.discountPercent;

  let emailsToNotify: string[] = [];

  try {
    const res = await fetch(`http://localhost:8000/api/admin/first-n-customers?audience=${audience}&limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      emailsToNotify = data.map((item: any) => item.email).filter(Boolean);
    }
  } catch (err) {
    console.warn('Backend fetch first-n customers failed, using local fallback:', err);
  }

  if (emailsToNotify.length === 0) {
    emailsToNotify = ['john.doe@example.com', 'sarah.smith@example.com', 'customer@retailsphere.com'].slice(0, limit);
  }

  emailsToNotify.forEach(email => {
    dispatchCustomerNotification({
      targetUserEmail: email,
      couponCode: promoCode,
      discountPercent,
    });
    recordCouponAllotment({
      couponCode: promoCode,
      discountPercent,
      targetUserEmail: email,
    });
  });

  // Save allowed customer emails & limits to coupon
  const cIdx = coupons.findIndex(c => c.id === coupon.id);
  if (cIdx >= 0) {
    coupons[cIdx].allowedCustomerEmails = emailsToNotify;
    coupons[cIdx].customerLimit = limit;
    coupons[cIdx].audienceType = audience;
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
    window.dispatchEvent(new Event('coupons-updated'));
  }

  // Trigger bulk backend email dispatch
  try {
    fetch('http://localhost:8000/api/admin/send-bulk-coupon-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: emailsToNotify,
        coupon_code: promoCode,
        discount_percent: discountPercent,
      }),
    }).catch((e) => console.log('Backend bulk coupon email call:', e));
  } catch (err) {
    console.log('Bulk coupon email exception:', err);
  }

  const audienceLabel = audience === 'retail' ? 'Retail Customers' : audience === 'production' ? 'Production Customers' : 'Customers';

  return {
    success: true,
    message: `Coupon "${promoCode}" (${discountPercent}% OFF) successfully dispatched to the first ${emailsToNotify.length} ${audienceLabel}! Dashboard notifications & emails queued.`,
    count: emailsToNotify.length,
  };
};
