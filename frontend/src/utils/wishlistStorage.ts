export interface WishlistItem {
  id: string;
  name: string;
  material?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  category?: string;
  subcategory?: string;
  dimensions?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  isCustomizable?: boolean;
  stock?: number;
}

const BASE_WISHLIST_KEY = 'retailsphere_wishlist';

function getWishlistKey(): string {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const userIdentifier = parsed.email || parsed.id || parsed.user_id;
      if (userIdentifier) {
        return `${BASE_WISHLIST_KEY}_${userIdentifier}`;
      }
    }
  } catch {
    // fallback to guest
  }
  return `${BASE_WISHLIST_KEY}_guest`;
}

export function getWishlistItems(): WishlistItem[] {
  try {
    const key = getWishlistKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWishlistItems(items: WishlistItem[]): void {
  try {
    const key = getWishlistKey();
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    console.error('Failed to save wishlist:', e);
  }
}

export function addToWishlist(product: WishlistItem): void {
  const current = getWishlistItems();
  if (!current.some((item) => item.id === product.id)) {
    current.push(product);
    saveWishlistItems(current);
  }
}

export function removeFromWishlist(id: string): WishlistItem[] {
  const current = getWishlistItems();
  const updated = current.filter((item) => item.id !== id);
  saveWishlistItems(updated);
  return updated;
}

export function toggleWishlist(product: WishlistItem): boolean {
  const current = getWishlistItems();
  const index = current.findIndex((item) => item.id === product.id);

  if (index > -1) {
    current.splice(index, 1);
    saveWishlistItems(current);
    return false; // Removed
  } else {
    current.push(product);
    saveWishlistItems(current);
    return true; // Added
  }
}

export function isInWishlist(id: string): boolean {
  const current = getWishlistItems();
  return current.some((item) => item.id === id);
}

export function getWishlistCount(): number {
  return getWishlistItems().length;
}

export function clearWishlist(): void {
  saveWishlistItems([]);
}
