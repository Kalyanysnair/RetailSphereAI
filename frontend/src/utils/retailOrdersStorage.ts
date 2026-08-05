export interface RetailOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface RetailOrder {
  orderId: string;
  customerId?: number;
  customerName: string;
  email: string;
  itemsCount: number;
  totalAmount: number;
  orderStatus: 'Order Placed' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Paid' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Cancelled';
  paymentId?: string;
  createdAt?: number;
  orderDate: string;
  items: RetailOrderItem[];
}

const BASE_URL = 'http://localhost:8000/api';
const STORAGE_KEY = 'retail_orders_list';

export function getStoredRetailOrders(): RetailOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export async function fetchRetailOrdersFromDB(): Promise<RetailOrder[]> {
  try {
    const res = await fetch(`${BASE_URL}/admin/orders`);
    if (res.ok) {
      const dbOrders: RetailOrder[] = await res.json();
      if (Array.isArray(dbOrders)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbOrders));
        window.dispatchEvent(new Event('retail-orders-updated'));
        return dbOrders;
      }
    }
  } catch (err) {
    console.warn('Could not fetch DB orders, fallback to local storage:', err);
  }
  return getStoredRetailOrders();
}

export async function saveStoredRetailOrder(orderData: Omit<RetailOrder, 'orderId' | 'orderDate'>): Promise<RetailOrder> {
  let dbOrderId: string | null = null;

  // Post directly to Backend PostgreSQL Database
  try {
    const res = await fetch(`${BASE_URL}/admin/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (res.ok) {
      const result = await res.json();
      if (result.orderId) {
        dbOrderId = result.orderId;
      }
    }
  } catch (err) {
    console.warn('DB order save failed:', err);
  }

  const existing = getStoredRetailOrders();
  const newOrder: RetailOrder = {
    ...orderData,
    orderId: dbOrderId || `RET-${Date.now().toString().slice(-6)}`,
    createdAt: Date.now(),
    orderDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  const updated = [newOrder, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('retail-orders-updated'));

  // Immediately refresh list from DB to ensure 100% database sync
  await fetchRetailOrdersFromDB();

  return newOrder;
}

export function cancelStoredRetailOrder(orderId: string): boolean {
  try {
    const existing = getStoredRetailOrders();
    const target = existing.find(o => o.orderId === orderId);
    if (target) {
      target.orderStatus = 'Cancelled';
      target.paymentStatus = 'Cancelled';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new Event('retail-orders-updated'));
    }

    fetch(`${BASE_URL}/admin/orders/${orderId}/cancel`, { method: 'PUT' })
      .catch((err) => console.warn('Cancel DB order sync error:', err));

    return true;
  } catch (err) {
    return false;
  }
}

export function deleteStoredRetailOrder(orderId: string): boolean {
  try {
    const existing = getStoredRetailOrders();
    const updated = existing.filter(o => o.orderId !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('retail-orders-updated'));

    fetch(`${BASE_URL}/admin/orders/${orderId}`, { method: 'DELETE' })
      .catch((err) => console.warn('Delete DB order error:', err));

    return true;
  } catch (err) {
    return false;
  }
}
