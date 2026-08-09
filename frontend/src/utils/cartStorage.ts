export interface CartItem {
  id: string;
  name: string;
  material: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

const BASE_CART_KEY = 'retailsphere_cart';

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

function repairCartItemIds(items: CartItem[]): { items: CartItem[]; modified: boolean } {
  let modified = false;
  const repaired = items.map(item => {
    const correctId = PRODUCT_NAME_TO_ID_MAP[item.name];
    if (correctId && item.id !== correctId) {
      modified = true;
      return { ...item, id: correctId };
    }
    return item;
  });
  return { items: repaired, modified };
}

function getCartKey(): string {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const userIdentifier = parsed.email || parsed.customer_email || parsed.user_email || parsed.username || parsed.id || parsed.user_id;
      if (userIdentifier) {
        return `${BASE_CART_KEY}_${userIdentifier.toString().toLowerCase().trim()}`;
      }
    }
  } catch {
    // fallback to guest
  }
  return `${BASE_CART_KEY}_guest`;
}

export function getCartItems(): CartItem[] {
  try {
    const key = getCartKey();
    const raw = localStorage.getItem(key);
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    const { items: repaired, modified } = repairCartItemIds(items);
    if (modified) {
      try {
        localStorage.setItem(key, JSON.stringify(repaired));
      } catch {}
    }
    return repaired;
  } catch {
    return [];
  }
}

export function saveCartItems(items: CartItem[]): void {
  try {
    const key = getCartKey();
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error('Failed to save cart:', e);
  }
}

export function addToCart(product: { id: string; name: string; material?: string; price: number; imageUrl?: string }): void {
  const current = getCartItems();
  const existingIndex = current.findIndex((item) => item.id === product.id);

  if (existingIndex > -1) {
    current[existingIndex].quantity += 1;
  } else {
    current.push({
      id: product.id,
      name: product.name,
      material: product.material || 'Premium Finish',
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl || '',
    });
  }

  saveCartItems(current);
}

export function updateCartQuantity(id: string, delta: number): CartItem[] {
  const current = getCartItems();
  const updated = current
    .map((item) => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    })
    .filter(Boolean) as CartItem[];

  saveCartItems(updated);
  return updated;
}

export function removeFromCart(id: string): CartItem[] {
  const current = getCartItems();
  const updated = current.filter((item) => item.id !== id);
  saveCartItems(updated);
  return updated;
}

export function clearCart(): void {
  saveCartItems([]);
}

export function getCartCount(): number {
  const current = getCartItems();
  return current.reduce((acc, item) => acc + item.quantity, 0);
}
