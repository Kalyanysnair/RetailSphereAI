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
      const userIdentifier = parsed.email || parsed.id || parsed.user_id;
      if (userIdentifier) {
        return `${BASE_CART_KEY}_${userIdentifier}`;
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
    return raw ? JSON.parse(raw) : [];
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
      imageUrl: product.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
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
