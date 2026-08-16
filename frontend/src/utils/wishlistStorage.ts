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

const PRODUCT_NAME_TO_ID_MAP: Record<string, string> = {
  'Nordic Bouclé Curved Lounge Sofa': 'rec-1',
  'Minimalist Teak Wood 6-Seater Dining Set': 'rec-2',
  'Calacatta Italian Marble Coffee Table': 'rec-3',
  'Royal Velvet Wingback Accent Armchair': 'rec-4',
  'Executive Teak Desk with Cable Management': 'rec-5',
  'Bespoke Modular Sectional Sofa': 'rec-6',
  'Empress Velvet Upholstered King Bed': 'rec-7',
  'Art Deco Brass & Brushed Steel Console': 'rec-8',
  'Executive Ergonomic Leather Office Chair': 'rec-9',
  'Artisan Rattan & Teak Sun Lounger Daybed': 'rec-10',
  'Architectural Marble Coffee Table': 'rec-11',
  'Scandinavian Floating Media Console': 'rec-12',
};

function getWishlistKey(): string {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const userIdentifier = parsed.email || parsed.customer_email || parsed.user_email || parsed.username || parsed.id || parsed.user_id;
      if (userIdentifier) {
        return `${BASE_WISHLIST_KEY}_${userIdentifier.toString().toLowerCase().trim()}`;
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
    const items: WishlistItem[] = raw ? JSON.parse(raw) : [];
    return items;
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
