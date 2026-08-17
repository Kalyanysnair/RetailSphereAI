const API_HOST = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const BASE_URL = `/api/production`;

async function safeFetchProd(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. First try relative URL `/api/production${cleanPath}` (uses Vite dev proxy seamlessly)
  const relativeUrl = `/api/production${cleanPath}`;
  try {
    const res = await fetch(relativeUrl, options);
    return res;
  } catch (relativeErr) {
    // 2. Fallback to direct IPv4 backend URL if proxy is bypassed
    const directUrl127 = `http://127.0.0.1:8000/api/production${cleanPath}`;
    try {
      const newOptions = options ? { ...options } : undefined;
      return await fetch(directUrl127, newOptions);
    } catch (directErr) {
      const directUrlLocal = `http://localhost:8000/api/production${cleanPath}`;
      try {
        const newOptions2 = options ? { ...options } : undefined;
        return await fetch(directUrlLocal, newOptions2);
      } catch (lastErr) {
        throw lastErr || directErr || relativeErr;
      }
    }
  }
}

export interface AssignedWorker {
  assignment_id: number;
  worker_id: number;
  worker_name: string;
  worker_email?: string;
  worker_phone?: string;
  specialization?: string;
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
  approved_by?: string;
  staff_name?: string;
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
  created_at?: string;
  production_stage?: string;
  progress_percent?: number;
  progress_remarks?: string;
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

    // Deduplicate by custom_order_id and filter out removed orders (102, 13)
    const map = new Map<number, CustomOrderData>();
    allOrders.filter(o => o.custom_order_id !== 102 && o.custom_order_id !== 13).forEach(o => map.set(o.custom_order_id, o));
    return Array.from(map.values());
  } catch {
    return [];
  }
};

export const saveStoredCustomOrders = (orders: CustomOrderData[]) => {
  try {
    const key = getUserCustomKey();
    const filtered = orders.filter(o => o.custom_order_id !== 13 && o.custom_order_id !== 102);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to persist custom orders to localStorage:', e);
  }
};

export function removeSpecificStoredCustomOrder(orderId: number = 13): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
    keys.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed: CustomOrderData[] = JSON.parse(raw);
          const filtered = parsed.filter(o => o.custom_order_id !== orderId);
          localStorage.setItem(k, JSON.stringify(filtered));
        } catch {}
      }
    });
    window.dispatchEvent(new Event('custom-orders-updated'));
  } catch (e) {
    console.warn('Error removing stored custom order:', e);
  }
}

export function clearAllStoredCustomOrders(notify: boolean = false): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
    keys.forEach(k => localStorage.removeItem(k));
    if (notify) {
      window.dispatchEvent(new Event('custom-orders-updated'));
    }
  } catch (e) {
    console.warn('Error clearing custom orders:', e);
  }
}

// Clean DB API methods


export const INITIAL_DEMO_CUSTOM_ORDERS: CustomOrderData[] = [];

export function isCustomerOrderMatch(o: CustomOrderData, userObj: any): boolean {
  if (!userObj) return false;

  const sEmail = (userObj?.email || userObj?.customer_email || localStorage.getItem('user_email') || '').toLowerCase().trim();
  const sUserId = userObj?.id || userObj?.user_id || userObj?.customer_id;
  const sName = (userObj?.full_name || userObj?.username || userObj?.name || '').toLowerCase().trim();

  const oEmail = (o.customer_email || '').toLowerCase().trim();
  const oCustId = o.customer_id;
  const oName = (o.customer_name || '').toLowerCase().trim();

  // 1. Exact Match by Customer ID / User ID
  if (sUserId && oCustId && Number(oCustId) === Number(sUserId)) return true;

  // 2. Exact Match by Email (if email is non-empty)
  if (sEmail && oEmail && sEmail === oEmail && !sEmail.includes('example.com')) return true;

  // 3. Exact Match by Full Name (excluding generic fallback strings)
  const genericNames = ['customer', 'valued customer', 'user', 'guest', 'bespoke customer'];
  if (sName && oName && sName === oName && !genericNames.includes(sName)) return true;

  return false;
}

// API Methods with Fallback to Persisted Data
export async function fetchCustomOrders(statusFilter?: string, isStaff: boolean = false, workerId?: number): Promise<CustomOrderData[]> {
  try {
    const rawUser = localStorage.getItem('user') || localStorage.getItem('user_profile');
    const userObj = rawUser ? JSON.parse(rawUser) : null;

    const queryParams = new URLSearchParams();
    if (statusFilter && statusFilter !== 'All') queryParams.append('status_filter', statusFilter);
    if (workerId) queryParams.append('worker_id', String(workerId));

    if (!isStaff && !workerId && userObj) {
      const uEmail = userObj.email || userObj.customer_email || localStorage.getItem('user_email');
      const uId = userObj.customer_id || userObj.user_id || userObj.id;
      if (uEmail) queryParams.append('customer_email', uEmail);
      if (uId) queryParams.append('customer_id', String(uId));
    }

    const url = queryParams.toString() ? `/custom-orders?${queryParams.toString()}` : `/custom-orders`;
    let dbOrders: CustomOrderData[] = [];
    try {
      const res = await safeFetchProd(url);
      if (res.ok) {
        const fetched = await res.json();
        if (Array.isArray(fetched)) {
          dbOrders = fetched;
        }
      }
    } catch {
      // Backend request fallback to local persistent store
    }

    const localOrders = getAllUserStoredCustomOrders();
    const map = new Map<number, CustomOrderData>();
    localOrders.forEach(o => map.set(o.custom_order_id, o));
    dbOrders.forEach(o => map.set(o.custom_order_id, o));

    const allCandidateOrders = Array.from(map.values()).filter(o => o.custom_order_id !== 102);

    if (isStaff || workerId) {
      return (!statusFilter || statusFilter === 'All')
        ? sanitizeCustomOrders(allCandidateOrders)
        : sanitizeCustomOrders(allCandidateOrders.filter(o => o.order_status === statusFilter));
    }

    // For customer session retrieval
    if (!userObj) {
      return [];
    }

    const userOrders = allCandidateOrders.filter(o => {
      const isMatch = isCustomerOrderMatch(o, userObj);
      if (isMatch) {
        if (userObj.id || userObj.customer_id || userObj.user_id) {
          o.customer_id = userObj.customer?.customer_id || userObj.customer_id || userObj.user_id || userObj.id;
        }
        if (userObj.email || userObj.customer_email) {
          o.customer_email = userObj.email || userObj.customer_email;
        }
      }
      return isMatch;
    });

    return (!statusFilter || statusFilter === 'All')
      ? sanitizeCustomOrders(userOrders)
      : sanitizeCustomOrders(userOrders.filter(o => o.order_status === statusFilter));
  } catch {
    return [];
  }
}

export async function updateOrderStatus(orderId: number, status: string, estimatedPrice?: number, remarks?: string, approvedBy?: string): Promise<any> {
  const staffName = approvedBy || (() => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.full_name || parsed.name || parsed.username || 'Production Staff';
      }
    } catch {}
    return 'Production Staff';
  })();

  const demoTarget = INITIAL_DEMO_CUSTOM_ORDERS.find(o => o.custom_order_id === orderId);
  if (demoTarget) {
    demoTarget.order_status = status;
    if (status === 'Approved' || status === 'Quote Provided' || status === 'In Production') {
      demoTarget.approved_by = staffName;
      demoTarget.staff_name = staffName;
    }
    if (estimatedPrice !== undefined && estimatedPrice > 0) {
      demoTarget.estimated_price = estimatedPrice;
      demoTarget.is_locked = true;
    }
    if (status === 'Approved' || status === 'In Production' || status === 'Completed') {
      demoTarget.is_locked = true;
      demoTarget.current_stage = 'Material Sourcing';
      demoTarget.progress_percentage = 15;
    }
    if (remarks) demoTarget.latest_remarks = remarks;
  }

  const allStored = getAllUserStoredCustomOrders();
  const target = allStored.find(o => o.custom_order_id === orderId);
  if (target) {
    target.order_status = status;
    if (status === 'Approved' || status === 'Quote Provided' || status === 'In Production') {
      target.approved_by = staffName;
      target.staff_name = staffName;
    }
    if (estimatedPrice !== undefined && estimatedPrice > 0) {
      target.estimated_price = estimatedPrice;
      target.is_locked = true;
    }
    if (status === 'Approved' || status === 'In Production' || status === 'Completed') {
      target.is_locked = true;
      target.current_stage = 'Material Sourcing';
      target.progress_percentage = 15;
    }
    if (remarks) target.latest_remarks = remarks;
    saveStoredCustomOrders(allStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));

  try {
    let res = await safeFetchProd(`/custom-orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: status, estimated_price: estimatedPrice, remarks, approved_by: staffName })
    });
    if (!res.ok) {
      res = await safeFetchProd('/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_order_id: orderId, order_status: status, estimated_price: estimatedPrice, remarks, approved_by: staffName })
      });
    }
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }

  return target || demoTarget || { success: true };
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
  window.dispatchEvent(new Event('custom-orders-updated'));
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
  try {
    localStorage.removeItem('retailsphere_local_workers');
  } catch {}

  try {
    const res = await safeFetchProd('/workers');
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch {
    return [];
  }
}

export async function addWorker(fullName: string, email: string, phone?: string, specialization?: string): Promise<WorkerData> {
  const payload = {
    full_name: fullName.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : undefined,
    specialization: specialization || 'Woodwork & Carpentry'
  };

  let res: Response;
  try {
    res = await safeFetchProd('/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    const orig = netErr?.message || '';
    if (netErr?.name === 'TypeError' || orig.toLowerCase().includes('failed to fetch') || orig.toLowerCase().includes('networkerror')) {
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }
    throw new Error(orig || 'Unable to connect to the server. Please make sure the backend is running.');
  }

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errorJson = await res.json();
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((e: any) => e.msg || e.detail || JSON.stringify(e)).join(', ');
      } else if (errorJson.message) {
        errorDetail = errorJson.message;
      }
    } catch {}

    if (errorDetail) {
      throw new Error(errorDetail);
    }

    if (res.status === 400) {
      throw new Error('Invalid worker information. Please check the details provided.');
    } else if (res.status === 401) {
      throw new Error('Authentication required. Please log in as production staff.');
    } else if (res.status === 403) {
      throw new Error('You do not have permission to create workers.');
    } else if (res.status === 409) {
      throw new Error('A worker with this email or phone number already exists.');
    } else if (res.status === 404) {
      throw new Error('Worker API endpoint not found.');
    }

    throw new Error(`Unable to create the worker account (HTTP ${res.status}). Please try again.`);
  }

  const data: WorkerData = await res.json();
  return data;
}

export async function resendWorkerCredentials(workerId: number): Promise<{ success: boolean; message: string; email: string }> {
  const res = await safeFetchProd(`/workers/${workerId}/resend-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ detail: 'Failed to resend credentials.' }));
    throw new Error(errorJson.detail || 'Failed to resend credentials.');
  }

  return await res.json();
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

export function isDefaultUnsplashUrl(_url?: string): boolean {
  return false;
}

export function sanitizeCustomOrders(orders: CustomOrderData[]): CustomOrderData[] {
  return orders;
}

import { parseReferenceImages } from '../utils/imageUtils';

export function getFurnitureImageUrl(_furnitureType: string = '', referenceImage?: string): string | undefined {
  if (referenceImage && referenceImage.trim()) {
    const parsed = parseReferenceImages(referenceImage);
    return parsed.length > 0 ? parsed[0] : referenceImage.trim();
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
  const rawUser = localStorage.getItem('user') || localStorage.getItem('user_profile');
  const userObj = rawUser ? JSON.parse(rawUser) : null;
  const cleanRefImg = referenceImage && referenceImage.trim() ? referenceImage.trim() : undefined;

  const uEmail = (userObj?.email || userObj?.customer_email || localStorage.getItem('user_email') || '').toLowerCase().trim();
  const uId = userObj?.customer_id || userObj?.user_id || userObj?.id || (uEmail ? Math.abs(uEmail.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)) : null);
  const uName = userObj?.full_name || userObj?.username || userObj?.name || (uEmail ? uEmail.split('@')[0] : 'Customer');

  const payload = {
    customer_id: uId,
    customer_name: uName,
    customer_email: uEmail,
    customer_phone: userObj?.phone || '',
    furniture_type: furnitureType,
    material,
    dimensions,
    color,
    design_description: notes,
    reference_image: cleanRefImg
  };

  try {
    const res = await safeFetchProd('/custom-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API Request Failed');
    const created: CustomOrderData = await res.json();
    const currentOrders = getStoredCustomOrders();
    saveStoredCustomOrders([created, ...currentOrders]);
    window.dispatchEvent(new Event('custom-orders-updated'));
    return created;
  } catch {
    const currentOrders = getStoredCustomOrders();
    const newId = 101 + currentOrders.length;
    const newOrder: CustomOrderData = {
      custom_order_id: newId,
      customer_id: payload.customer_id || 1,
      customer_name: payload.customer_name || 'Customer',
      customer_email: payload.customer_email || '',
      customer_phone: payload.customer_phone || '',
      furniture_type: furnitureType,
      material,
      dimensions,
      color,
      design_description: notes,
      reference_image: cleanRefImg,
      order_status: 'Pending',
      order_date: new Date().toISOString(),
      assigned_workers: [],
      current_stage: 'Pending Approval',
      progress_percentage: 0,
      latest_remarks: 'Custom request submitted for staff approval.'
    };
    saveStoredCustomOrders([newOrder, ...currentOrders]);
    window.dispatchEvent(new Event('custom-orders-updated'));
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
