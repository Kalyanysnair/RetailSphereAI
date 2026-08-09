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
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out old legacy combined mock payment ID pay_Kangaroby902
    return parsed.filter((o: any) => o.paymentId !== 'pay_Kangaroby902' && o.payment_id !== 'pay_Kangaroby902');
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
        return dbOrders;
      }
    }
  } catch (err) {
    console.warn('Could not fetch DB orders, fallback to local storage:', err);
  }
  return getStoredRetailOrders();
}

export async function saveStoredRetailOrder(orderData: Omit<RetailOrder, 'orderId' | 'orderDate'>): Promise<RetailOrder> {
  const safePayload = {
    ...orderData,
    customerId: orderData.customerId ? (typeof orderData.customerId === 'number' ? orderData.customerId : (parseInt(String(orderData.customerId).replace(/\D/g, ''), 10) || null)) : null
  };

  let dbOrderId: string | null = null;
  try {
    const res = await fetch(`${BASE_URL}/admin/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload)
    });
    if (res.ok) {
      const result = await res.json();
      if (result.orderId) {
        dbOrderId = result.orderId;
      }
    } else {
      const text = await res.text();
      console.warn('DB order post returned status:', res.status, text);
    }
  } catch (err) {
    console.warn('DB order post error:', err);
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
