export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
}

const COUPONS_STORAGE_KEY = 'retailsphere_coupons_v1';

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
