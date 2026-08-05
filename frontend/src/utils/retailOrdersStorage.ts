export interface RetailOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface RetailOrder {
  orderId: string;
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
      if (Array.isArray(dbOrders) && dbOrders.length > 0) {
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

export function saveStoredRetailOrder(orderData: Omit<RetailOrder, 'orderId' | 'orderDate'>): RetailOrder {
  const existing = getStoredRetailOrders();
  const newOrder: RetailOrder = {
    ...orderData,
    orderId: `RET-${Date.now().toString().slice(-6)}`,
    createdAt: Date.now(),
    orderDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  const updated = [newOrder, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('retail-orders-updated'));

  // Post to Backend PostgreSQL Database
  fetch(`${BASE_URL}/admin/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  }).then(async (res) => {
    if (res.ok) {
      const result = await res.json();
      if (result.orderId) {
        newOrder.orderId = result.orderId;
        const currentList = getStoredRetailOrders();
        if (currentList.length > 0) {
          currentList[0].orderId = result.orderId;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
          window.dispatchEvent(new Event('retail-orders-updated'));
        }
      }
    }
  }).catch((err) => {
    console.warn('DB order save fallback:', err);
  });

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
