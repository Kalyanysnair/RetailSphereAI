const API_HOST = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '127.0.0.1' : (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
const BASE_URL = `http://${API_HOST}:8000/api/production`;

async function safeFetchProd(endpoint: string, options?: RequestInit): Promise<Response> {
  const primaryHost = API_HOST;
  const secondaryHost = primaryHost === '127.0.0.1' ? 'localhost' : '127.0.0.1';
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const urls = [
    `http://${primaryHost}:8000/api/production${cleanPath}`,
    `http://${secondaryHost}:8000/api/production${cleanPath}`
  ];

  let lastErr: any = null;
  for (const u of urls) {
    try {
      return await fetch(u, options);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new TypeError('Failed to fetch from backend server');
}

export interface AssignedWorker {
  assignment_id: number;
  worker_id: number;
  worker_name: string;
  task_status: string;
}

export interface CustomOrderData {
  custom_order_id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  furniture_type: string;
  material: string;
  dimensions: string;
  color: string;
  design_description?: string;
  reference_image?: string;
  estimated_price?: number;
  order_status: 'Pending' | 'Approved' | 'Rejected' | 'In Production' | 'Completed' | string;
  order_date: string;
  assigned_workers: AssignedWorker[];
  current_stage: string;
  progress_percentage: number;
  latest_remarks?: string;
  is_locked?: boolean;
  payment_status?: 'Pending' | 'Paid' | string;
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
}

export interface WorkerData {
  worker_id: number;
  full_name: string;
  email: string;
  phone: string;
  specialization?: string;
  status: boolean;
  generated_password?: string;
  email_sent?: boolean;
  email_error?: string;
}

export interface ProgressTimelineItem {
  progress_id: number;
  stage: string;
  progress_percentage: number;
  remarks?: string;
  updated_at: string;
}

export interface OrderTrackingInfo {
  custom_order_id: number;
  furniture_type: string;
  material: string;
  dimensions: string;
  color: string;
  order_status: string;
  estimated_price?: number;
  assigned_workers: { worker_name: string; assigned_date?: string; task_status: string }[];
  timeline: ProgressTimelineItem[];
}

// Local DB Sync Helpers for Custom Orders
const BASE_CUSTOM_KEY = 'retailsphere_custom_orders';

function getUserCustomKey(): string {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const userIdentifier = parsed.email || parsed.id || parsed.user_id;
      if (userIdentifier) {
        return `${BASE_CUSTOM_KEY}_${userIdentifier}`;
      }
    }
  } catch {
    // fallback
  }
  return `${BASE_CUSTOM_KEY}_guest`;
}

export const getStoredCustomOrders = (): CustomOrderData[] => {
  try {
    const key = getUserCustomKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch {
    return [];
  }
};

export const getAllUserStoredCustomOrders = (): CustomOrderData[] => {
  try {
    const allOrders: CustomOrderData[] = [];
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
    keys.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed: CustomOrderData[] = JSON.parse(raw);
          allOrders.push(...parsed);
        } catch { }
      }
    });

    // Deduplicate by custom_order_id
    const map = new Map<number, CustomOrderData>();
    allOrders.forEach(o => map.set(o.custom_order_id, o));
    return Array.from(map.values());
  } catch {
    return [];
  }
};

export const saveStoredCustomOrders = (orders: CustomOrderData[]) => {
  try {
    const key = getUserCustomKey();
    localStorage.setItem(key, JSON.stringify(orders));
  } catch (e) {
    console.warn('Failed to persist custom orders to localStorage:', e);
  }
};

// Clean DB API methods


// API Methods with Fallback to Persisted Data
export async function fetchCustomOrders(statusFilter?: string, isStaff: boolean = false): Promise<CustomOrderData[]> {
  try {
    const url = statusFilter ? `/custom-orders?status_filter=${encodeURIComponent(statusFilter)}` : `/custom-orders`;
    const res = await safeFetchProd(url);
    if (!res.ok) throw new Error('API request failed');
    const dbOrders: CustomOrderData[] = await res.json();

    if (Array.isArray(dbOrders)) {
      saveStoredCustomOrders(dbOrders);

      if (isStaff) {
        return (!statusFilter || statusFilter === 'All') ? sanitizeCustomOrders(dbOrders) : sanitizeCustomOrders(dbOrders.filter(o => o.order_status === statusFilter));
      }

      const rawUser = localStorage.getItem('user');
      const userObj = rawUser ? JSON.parse(rawUser) : null;
      const userEmail = (userObj?.email || userObj?.customer_email || '').toLowerCase().trim();
      const userId = userObj?.id || userObj?.user_id || userObj?.customer_id;

      const userDbOrders = dbOrders.filter(o => {
        if (!userObj) return false;
        const oEmail = (o.customer_email || '').toLowerCase().trim();
        const oCustId = o.customer_id;

        if (userId && oCustId && Number(oCustId) === Number(userId)) return true;
        if (userEmail && oEmail && oEmail === userEmail) return true;

        return false;
      });

      return (!statusFilter || statusFilter === 'All') ? sanitizeCustomOrders(userDbOrders) : sanitizeCustomOrders(userDbOrders.filter(o => o.order_status === statusFilter));
    }

    const stored = isStaff ? getAllUserStoredCustomOrders() : getStoredCustomOrders();
    return (!statusFilter || statusFilter === 'All') ? sanitizeCustomOrders(stored) : sanitizeCustomOrders(stored.filter(o => o.order_status === statusFilter));
  } catch {
    const allOrders = isStaff ? getAllUserStoredCustomOrders() : getStoredCustomOrders();
    if (!statusFilter || statusFilter === 'All') return sanitizeCustomOrders(allOrders);
    return sanitizeCustomOrders(allOrders.filter(o => o.order_status === statusFilter));
  }
}

export async function updateOrderStatus(orderId: number, status: string, estimatedPrice?: number, remarks?: string): Promise<any> {
  try {
    const res = await safeFetchProd('/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_order_id: orderId, order_status: status, estimated_price: estimatedPrice, remarks })
    });
    if (!res.ok) throw new Error('Failed to update status in DB');
    const result = await res.json();

    // Sync local storage
    const stored = getStoredCustomOrders();
    const target = stored.find(o => o.custom_order_id === orderId);
    if (target) {
      target.order_status = status;
      if (estimatedPrice !== undefined && estimatedPrice > 0) {
        target.estimated_price = estimatedPrice;
        target.is_locked = true;
      }
      if (status === 'Approved' || status === 'In Production' || status === 'Completed') {
        target.is_locked = true;
      }
      if (remarks) target.latest_remarks = remarks;
      saveStoredCustomOrders(stored);
    }
    return result;
  } catch (err: any) {
    const stored = getStoredCustomOrders();
    const ord = stored.find(o => o.custom_order_id === orderId);
    if (ord) {
      ord.order_status = status;
      if (estimatedPrice !== undefined && estimatedPrice > 0) {
        ord.estimated_price = estimatedPrice;
        ord.is_locked = true;
      }
      if (status === 'Approved' || status === 'In Production' || status === 'Completed') {
        ord.is_locked = true;
        ord.current_stage = 'Material Sourcing';
        ord.progress_percentage = 15;
        ord.latest_remarks = remarks || 'Order approved by production team.';
      } else if (status === 'Rejected') {
        ord.current_stage = 'Rejected';
        ord.progress_percentage = 0;
        ord.latest_remarks = remarks || 'Specs cannot be fulfilled.';
      }
      saveStoredCustomOrders(stored);
    }
    return { message: `Order #${orderId} status updated to ${status}` };
  }
}

export async function toggleLockOrderSpecifications(orderId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to lock order');
    await res.json();
  } catch (err) {
    console.warn('DB lock request failed, fallback locally:', err);
  }

  const stored = getStoredCustomOrders();
  const ord = stored.find(o => o.custom_order_id === orderId);
  if (ord) {
    ord.is_locked = true;
    if (ord.order_status === 'Pending' || ord.order_status === 'Pending Approval') {
      ord.order_status = 'Approved';
    }
    saveStoredCustomOrders(stored);
  }
  return true;
}

export async function cancelCustomOrder(orderId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to cancel order');
    await res.json();
  } catch (err) {
    console.warn('DB cancel request failed, fallback locally:', err);
  }

  const userStored = getStoredCustomOrders();
  const userTarget = userStored.find(o => o.custom_order_id === orderId);
  if (userTarget) {
    userTarget.order_status = 'Cancelled';
    saveStoredCustomOrders(userStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));
  return true;
}

export async function payCustomOrder(orderId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to record payment');
    await res.json();
  } catch (err) {
    console.warn('DB pay request failed, fallback locally:', err);
  }

  const stored = getStoredCustomOrders();
  const ord = stored.find(o => o.custom_order_id === orderId);
  if (ord) {
    ord.payment_status = 'Paid';
    ord.order_status = 'Paid';
    ord.is_locked = true;
    saveStoredCustomOrders(stored);
  }
  return true;
}

function getLocalWorkers(): WorkerData[] {
  try {
    const raw = localStorage.getItem('retailsphere_local_workers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalWorker(worker: WorkerData) {
  try {
    const current = getLocalWorkers();
    const filtered = current.filter(w => w.worker_id !== worker.worker_id && w.email.toLowerCase() !== worker.email.toLowerCase());
    filtered.unshift(worker);
    localStorage.setItem('retailsphere_local_workers', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save worker to local storage:', e);
  }
}

function removeLocalWorker(workerId: number) {
  try {
    const current = getLocalWorkers();
    const filtered = current.filter(w => w.worker_id !== workerId);
    localStorage.setItem('retailsphere_local_workers', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove worker from local storage:', e);
  }
}

function generateAutoPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function fetchWorkers(): Promise<WorkerData[]> {
  let dbWorkers: WorkerData[] = [];
  try {
    const res = await safeFetchProd('/workers');
    if (res.ok) {
      dbWorkers = await res.json();
    }
  } catch {
    // try next
  }

  const localWorkers = getLocalWorkers();
  const merged = [...dbWorkers];

  localWorkers.forEach(lw => {
    if (!merged.some(w => w.email.toLowerCase() === lw.email.toLowerCase() || w.worker_id === lw.worker_id)) {
      merged.push(lw);
    }
  });

  return merged;
}

export async function addWorker(fullName: string, email: string, phone?: string, specialization?: string): Promise<WorkerData> {
  const payload = {
    full_name: fullName.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : undefined,
    specialization: specialization || 'Woodwork & Carpentry'
  };

  let data: WorkerData | null = null;

  try {
    const res = await safeFetchProd('/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res && res.ok) {
      data = await res.json();
    } else if (res && !res.ok) {
      const errorJson = await res.json().catch(() => ({ detail: '' }));
      if (errorJson.detail && !errorJson.detail.toLowerCase().includes('fetch')) {
        throw new Error(errorJson.detail);
      }
    }
  } catch (err: any) {
    if (err && err.message && !err.message.toLowerCase().includes('fetch')) {
      throw err;
    }
  }

  if (!data) {
    const autoPassword = generateAutoPassword();
    data = {
      worker_id: Date.now(),
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '+919876543210',
      specialization: specialization || 'Woodwork & Carpentry',
      status: true,
      generated_password: autoPassword
    };
  }

  saveLocalWorker(data);
  return data;
}

export async function deleteWorker(workerId: number): Promise<any> {
  try {
    await safeFetchProd(`/workers/${workerId}`, { method: 'DELETE' });
  } catch {
    // ignore
  }

  removeLocalWorker(workerId);
  return { message: `Worker #${workerId} removed` };
}

export async function updateWorker(workerId: number, fullName: string, email: string, phone?: string, specialization?: string): Promise<WorkerData> {
  const payload = {
    full_name: fullName.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : undefined,
    specialization: specialization || 'Woodwork & Carpentry'
  };

  const res = await safeFetchProd(`/workers/${workerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ detail: 'Failed to update worker details' }));
    throw new Error(errorJson.detail || 'Failed to update worker details');
  }

  const data: WorkerData = await res.json();
  saveLocalWorker(data);
  return data;
}

export async function toggleWorkerStatus(workerId: number, newStatus: boolean): Promise<WorkerData> {
  let res: Response | null = null;
  try {
    res = await safeFetchProd(`/workers/${workerId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch {
    // ignore
  }

  const localWorkers = getLocalWorkers();
  const target = localWorkers.find(w => w.worker_id === workerId);
  if (target) {
    target.status = newStatus;
    saveLocalWorker(target);
  }

  if (res && res.ok) {
    return await res.json();
  }
  return target || { worker_id: workerId, full_name: 'Worker', email: '', phone: '', status: newStatus };
}

export async function assignWorkerTask(orderId: number, workerId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/assign-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ custom_order_id: orderId, worker_id: workerId })
  });
  if (!res.ok) throw new Error('Failed to assign worker in database');
  return await res.json();
}

export async function updateProductionProgress(orderId: number, stage: string, percentage: number, remarks?: string): Promise<any> {
  const res = await safeFetchProd('/update-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ custom_order_id: orderId, stage, progress_percentage: percentage, remarks })
  });
  if (!res.ok) throw new Error('Failed to update progress in database');
  return await res.json();
}

export async function fetchOrderTrackingTimeline(orderId: number): Promise<OrderTrackingInfo> {
  const res = await fetch(`${BASE_URL}/custom-orders/${orderId}/tracking`);
  if (!res.ok) throw new Error('Failed to fetch tracking from database');
  return await res.json();
}

export function isDefaultUnsplashUrl(url?: string): boolean {
  if (!url) return false;
  const defaults = [
    'photo-1615066390971',
    'photo-1533779283484',
    'photo-1518455027359',
    'photo-1540518614846',
    'photo-1505693416388',
    'photo-1567538096630',
    'photo-1595428774223',
    'photo-1555041469',
    'photo-1538688525198'
  ];
  return defaults.some((d) => url.includes(d));
}

export function sanitizeCustomOrders(orders: CustomOrderData[]): CustomOrderData[] {
  return orders.map((o) => {
    if (o.reference_image && isDefaultUnsplashUrl(o.reference_image)) {
      return { ...o, reference_image: undefined };
    }
    return o;
  });
}

export function getFurnitureImageUrl(_furnitureType: string = '', referenceImage?: string): string | undefined {
  if (referenceImage && referenceImage.trim() && !isDefaultUnsplashUrl(referenceImage)) {
    return referenceImage.trim();
  }
  return undefined;
}

export async function submitCustomOrderRequest(
  furnitureType: string,
  material: string,
  dimensions: string,
  color: string,
  notes?: string,
  referenceImage?: string
): Promise<CustomOrderData> {
  const storedUser = localStorage.getItem('user');
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const cleanRefImg = (referenceImage && referenceImage.trim() && !isDefaultUnsplashUrl(referenceImage))
    ? referenceImage.trim()
    : undefined;

  const payload = {
    customer_id: userObj?.id || userObj?.customer_id || 1,
    customer_name: userObj?.full_name || userObj?.username || 'Customer',
    customer_email: userObj?.email || userObj?.customer_email || '',
    customer_phone: userObj?.phone || '',
    furniture_type: furnitureType,
    material,
    dimensions,
    color,
    design_description: notes,
    reference_image: cleanRefImg
  };

  try {
    const res = await fetch(`${BASE_URL}/custom-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API Request Failed');
    const created: CustomOrderData = await res.json();
    const cleanCreated = isDefaultUnsplashUrl(created.reference_image) ? { ...created, reference_image: undefined } : created;
    const currentOrders = getStoredCustomOrders();
    saveStoredCustomOrders([cleanCreated, ...currentOrders]);
    return cleanCreated;
  } catch {
    const currentOrders = getStoredCustomOrders();
    const newId = 101 + currentOrders.length;
    const newOrder: CustomOrderData = {
      custom_order_id: newId,
      customer_id: payload.customer_id,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      furniture_type: furnitureType,
      material,
      dimensions,
      color,
      design_description: notes,
      reference_image: cleanRefImg,
      order_status: 'Pending',
      order_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      assigned_workers: [],
      current_stage: 'Pending Approval',
      progress_percentage: 0,
      latest_remarks: 'Custom request submitted for staff approval.'
    };
    saveStoredCustomOrders([newOrder, ...currentOrders]);
    return newOrder;
  }
}

export function downloadPaymentReceipt(order: CustomOrderData) {
  const receiptId = `REC-CUST-${order.custom_order_id}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const finalPrice = order.estimated_price || 0;
  const originalSubtotal = order.originalSubtotal || (finalPrice + (order.discountDeducted || 0));
  const discountDeducted = order.discountDeducted || 0;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payment Receipt - Order #${order.custom_order_id}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #faf7f2; color: #2c241d; padding: 40px; margin: 0; }
    .receipt-card { max-width: 650px; margin: 0 auto; background: #ffffff; border: 2px solid #e2d7cb; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f0e6da; padding-bottom: 20px; margin-bottom: 25px; }
    .brand { font-size: 26px; font-weight: 800; color: #38a132; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #7a6c5e; font-weight: 700; margin-top: 2px; }
    .badge { background: #dcfce7; color: #166534; font-weight: 800; padding: 8px 18px; border-radius: 50px; font-size: 12px; border: 1px solid #bbf7d0; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #faf7f2; padding: 20px; border-radius: 16px; border: 1px solid #e2d7cb; }
    .meta-item label { display: block; font-size: 10px; font-weight: 800; color: #7a6c5e; text-transform: uppercase; margin-bottom: 3px; }
    .meta-item span { font-size: 13px; font-weight: 700; color: #2c241d; }
    .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .specs-table th { text-align: left; font-size: 11px; font-weight: 800; color: #7a6c5e; text-transform: uppercase; border-bottom: 2px solid #e2d7cb; padding: 10px 0; }
    .specs-table td { font-size: 13px; font-weight: 600; padding: 12px 0; border-bottom: 1px solid #f0e6da; }
    .breakdown-box { background: #fdfbf7; border: 1px solid #e2d7cb; border-radius: 16px; padding: 18px; margin-bottom: 20px; }
    .breakdown-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 6px 0; color: #2c241d; }
    .breakdown-row.discount { color: #15803d; font-weight: 800; }
    .total-box { display: flex; justify-content: space-between; align-items: center; background: #2c241d; color: #ffffff; padding: 24px; border-radius: 18px; }
    .total-box .amount { font-size: 26px; font-weight: 800; color: #48a63e; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #7a6c5e; border-top: 1px solid #f0e6da; padding-top: 20px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div>
        <div class="brand">RetailSphere AI</div>
        <div class="subtitle">Bespoke Artisan Furniture Studio • Official Payment Receipt</div>
      </div>
      <div class="badge">✓ PAID IN FULL</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><label>Receipt No.</label><span>${receiptId}</span></div>
      <div class="meta-item"><label>Date Paid</label><span>${dateStr}</span></div>
      <div class="meta-item"><label>Customer Name</label><span>${order.customer_name}</span></div>
      <div class="meta-item"><label>Customer Email</label><span>${order.customer_email || 'Registered Client'}</span></div>
    </div>

    <table class="specs-table">
      <thead>
        <tr><th>Furniture Specifications</th><th>Details</th></tr>
      </thead>
      <tbody>
        <tr><td>Furniture Item</td><td>${order.furniture_type}</td></tr>
        <tr><td>Custom Dimensions</td><td>${order.dimensions}</td></tr>
        <tr><td>Timber / Material</td><td>${order.material}</td></tr>
        <tr><td>Color & Finish</td><td>${order.color}</td></tr>
      </tbody>
    </table>

    <div class="breakdown-box">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #7a6c5e; margin-bottom: 10px; border-bottom: 1px solid #e2d7cb; padding-bottom: 6px;">Financial Breakdown</div>
      <div class="breakdown-row">
        <span>Original Subtotal</span>
        <span>₹${originalSubtotal.toLocaleString('en-IN')}</span>
      </div>
      ${order.couponCode ? `
      <div class="breakdown-row discount">
        <span>🏷️ Promo Discount (${order.couponCode}${order.discountType ? ` - ${order.discountType}` : ''})</span>
        <span>-₹${discountDeducted.toLocaleString('en-IN')}</span>
      </div>
      ` : ''}
      <div class="breakdown-row">
        <span>Standard Shipping & Delivery</span>
        <span>${order.shippingFee === 0 || !order.shippingFee ? 'FREE' : `₹${order.shippingFee.toLocaleString('en-IN')}`}</span>
      </div>
    </div>

    <div class="total-box">
      <div>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #d0c8be; margin-bottom: 4px;">Final Amount Paid After Discounts</div>
        <div style="font-size: 12px; color: #e2d7cb;">Status: Verified Electronic Payment</div>
      </div>
      <div class="amount">₹${finalPrice.toLocaleString('en-IN')}</div>
    </div>

    <div class="footer">
      Thank you for choosing RetailSphere AI. Official E-Receipt & Tax Invoice Document.
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(htmlContent);
    printWin.document.close();
  }
}
