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
  orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Paid';
  paymentStatus: 'Paid' | 'Pending';
  orderDate: string;
  items: RetailOrderItem[];
}

const STORAGE_KEY = 'retail_orders_list';

export function getStoredRetailOrders(): RetailOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredRetailOrder(orderData: Omit<RetailOrder, 'orderId' | 'orderDate'>): RetailOrder {
  const existing = getStoredRetailOrders();
  const newOrder: RetailOrder = {
    ...orderData,
    orderId: `RET-${Date.now().toString().slice(-6)}`,
    orderDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  const updated = [newOrder, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('retail-orders-updated'));
  return newOrder;
}
