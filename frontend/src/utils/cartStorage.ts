export interface CartItem {
  id: string;
  name: string;
  material: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

const BASE_CART_KEY = 'retailsphere_cart';

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
    return items;
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
  const existingIndex = current.findIndex(
    (item) => item.id === product.id || (product.name && item.name === product.name)
  );

  if (existingIndex > -1) {
    current[existingIndex].quantity += 1;
    if (product.id && current[existingIndex].id !== product.id) {
      current[existingIndex].id = product.id;
    }
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
      if (item.id === id || item.name === id) {
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
  const updated = current.filter((item) => item.id !== id && item.name !== id);
  saveCartItems(updated);
  return updated;
}

export function clearCart(): void {
  saveCartItems([]);
}

const DIRECT_CHECKOUT_KEY = 'retailsphere_direct_checkout_item';

export function setDirectCheckoutItem(product: { id: string; name: string; material?: string; price: number; imageUrl?: string; quantity?: number }): void {
  try {
    const item: CartItem = {
      id: product.id,
      name: product.name,
      material: product.material || 'Premium Finish',
      price: product.price,
      quantity: product.quantity || 1,
      imageUrl: product.imageUrl || '',
    };
    sessionStorage.setItem(DIRECT_CHECKOUT_KEY, JSON.stringify(item));
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error('Failed to set direct checkout item:', e);
  }
}

export function getDirectCheckoutItem(): CartItem | null {
  try {
    const raw = sessionStorage.getItem(DIRECT_CHECKOUT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function clearDirectCheckoutItem(): void {
  try {
    sessionStorage.removeItem(DIRECT_CHECKOUT_KEY);
    window.dispatchEvent(new Event('cart-updated'));
  } catch {}
}

export function getCartCount(): number {
  const current = getCartItems();
  return current.reduce((acc, item) => acc + item.quantity, 0);
}
