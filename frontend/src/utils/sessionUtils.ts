/**
 * Centralized Session & Identity Management Utility
 * Ensures clean login, account switching, and logout without state leakage.
 */

export const clearUserSession = (): void => {
  try {
    const keysToRemove = [
      'access_token',
      'user',
      'user_profile',
      'user_email',
      'user_id',
      'customer_id',
      'role',
      'user_role',
      'retailsphere_cart',
      'retailsphere_wishlist'
    ];

    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Remove legacy prefixed keys
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (
        key.startsWith('user_custom_orders_') ||
        key.startsWith('user_authorities_') ||
        key.startsWith('cart_') ||
        key.startsWith('wishlist_')
      ) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();

    // Trigger state reset events
    window.dispatchEvent(new Event('user-logout'));
    window.dispatchEvent(new Event('cart-updated'));
    window.dispatchEvent(new Event('wishlist-updated'));
    window.dispatchEvent(new Event('custom-orders-updated'));
  } catch (e) {
    console.warn('Error clearing user session:', e);
  }
};

export const getStoredUserIdentity = (): {
  userId: number | null;
  customerId: number | null;
  email: string | null;
  roleName: string | null;
  userObj: any | null;
} => {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('user_profile');
    if (!raw) return { userId: null, customerId: null, email: null, roleName: null, userObj: null };

    const parsed = JSON.parse(raw);
    const userId = parsed.user_id || parsed.id || null;
    const customerId = parsed.customer?.customer_id || parsed.customer_id || null;
    const email = parsed.email || parsed.customer_email || null;
    const roleName = parsed.role_name || parsed.role || null;

    return { userId, customerId, email, roleName, userObj: parsed };
  } catch {
    return { userId: null, customerId: null, email: null, roleName: null, userObj: null };
  }
};
