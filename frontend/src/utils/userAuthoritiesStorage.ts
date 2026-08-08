export type CapabilityKey = 
  | 'full_admin'
  | 'user_management'
  | 'staff_management'
  | 'product_catalog'
  | 'stock_inventory'
  | 'supplier_management'
  | 'coupon_management'
  | 'order_fulfillment';

export interface UserAuthorityRecord {
  email: string;
  role: string;
  isFullAdmin: boolean;
  capabilities: CapabilityKey[];
  assignedDate: string;
  assignedBy: string;
}

export const CAPABILITY_DEFINITIONS: { key: CapabilityKey; label: string; description: string }[] = [
  { key: 'full_admin', label: 'Full System Admin Authority', description: 'Unrestricted executive control across all system functions' },
  { key: 'user_management', label: 'User Account Management', description: 'Manage, activate, deactivate, and audit customer accounts' },
  { key: 'staff_management', label: 'Staff Accounts & Credentials', description: 'Create and dispatch credentials to Retail & Production staff' },
  { key: 'product_catalog', label: 'Product Catalog Management', description: 'Create, update, and organize furniture store catalog items' },
  { key: 'stock_inventory', label: 'Stock & Inventory Control', description: 'Update stock levels, track low stock, and manage warehouse quantities' },
  { key: 'supplier_management', label: 'Supplier & Vendor Management', description: 'Manage ready-made furniture manufacturers and wholesale suppliers' },
  { key: 'coupon_management', label: 'Coupons & Discount Allotments', description: 'Create promo codes and allot discount vouchers to customers' },
  { key: 'order_fulfillment', label: 'Customer Orders & Fulfillment', description: 'Inspect, process, update status, and manage customer orders' },
];

const STORAGE_KEY = 'retailsphere_user_authorities';

const INITIAL_AUTHORITIES: UserAuthorityRecord[] = [
  {
    email: 'admin@retailsphere.com',
    role: 'Admin',
    isFullAdmin: true,
    capabilities: ['full_admin', 'user_management', 'staff_management', 'product_catalog', 'stock_inventory', 'supplier_management', 'coupon_management', 'order_fulfillment'],
    assignedDate: 'Initial System Provision',
    assignedBy: 'Super Admin',
  }
];

export const getStoredUserAuthorities = (): UserAuthorityRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_AUTHORITIES));
      return INITIAL_AUTHORITIES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUTHORITIES;
  }
};

export const getAuthorityForEmail = (email: string): UserAuthorityRecord | null => {
  const all = getStoredUserAuthorities();
  return all.find(a => a.email.toLowerCase().trim() === email.toLowerCase().trim()) || null;
};

export const saveUserAuthority = (record: UserAuthorityRecord): UserAuthorityRecord => {
  const current = getStoredUserAuthorities();
  const index = current.findIndex(a => a.email.toLowerCase().trim() === record.email.toLowerCase().trim());
  let updated: UserAuthorityRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = record;
  } else {
    updated = [record, ...current];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return record;
};
