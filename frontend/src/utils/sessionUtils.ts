/**
 * Centralized Session & Identity Management Utility
 * Ensures clean login, account switching, and automatic logout when browser/project closes.
 */

const SESSION_ACTIVE_KEY = 'retailsphere_session_active';

/**
 * Initializes session management.
 * If there is no active session in this browser tab/window (e.g. after browser was closed and reopened),
 * stale persistent credentials in localStorage are automatically cleared so the user is prompted to log in.
 */
export const initSessionManagement = (): void => {
  try {
    if (typeof window === 'undefined') return;
    const isSessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (!isSessionActive) {
      clearUserSession();
    }
  } catch (e) {
    console.warn('Error initializing session management:', e);
  }
};

/**
 * Marks the current browser session as active upon successful authentication.
 */
export const markSessionActive = (): void => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    }
  } catch (e) {
    console.warn('Error marking session active:', e);
  }
};

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
    window.dispatchEvent(new Event('storage'));
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
    const roleName = parsed.role_name || parsed.role?.role_name || parsed.role || null;

    return { userId, customerId, email, roleName, userObj: parsed };
  } catch {
    return { userId: null, customerId: null, email: null, roleName: null, userObj: null };
  }
};

/**
 * Determines the target dashboard URL according to the user's role.
 */
export const getRoleDashboardPath = (user: any): string => {
  if (!user) return '/dashboard';
  const roleName = (user.role_name || user.role?.role_name || user.role || '').toString().toLowerCase();
  const email = (user.email || user.customer_email || '').toString().toLowerCase();
  const username = (user.username || user.name || user.full_name || '').toString().toLowerCase();

  if (roleName.includes('admin') || username === 'admin' || email.includes('admin')) {
    return '/admin';
  }
  if (
    roleName.includes('retail') ||
    (roleName.includes('staff') && !roleName.includes('production')) ||
    username.includes('retail')
  ) {
    return '/retail-staff';
  }
  if (roleName.includes('production') || username.includes('production')) {
    return '/production-staff';
  }
  if (roleName.includes('artisan') || roleName.includes('worker') || username.includes('worker')) {
    return '/worker';
  }
  if (
    roleName.includes('carrier') ||
    username.includes('carrier') ||
    email === 'mariyageorge2027@mca.ajce.in' ||
    email === 'gmariya731@gmail.com'
  ) {
    return '/carrier';
  }
  if (
    roleName.includes('delivery') ||
    roleName.includes('driver') ||
    username.includes('driver') ||
    username.includes('personnel') ||
    email === 'deepthidpk004@gmail.com' ||
    email === 'deepthicd2027@mca.ajce.in'
  ) {
    return '/delivery-personnel';
  }
  return '/dashboard';
};

