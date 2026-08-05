const BASE_URL = 'http://localhost:8000/api/production';

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
}

export interface WorkerData {
  worker_id: number;
  full_name: string;
  email: string;
  phone: string;
  specialization?: string;
  status: boolean;
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
        } catch {}
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

let mockCustomOrders: CustomOrderData[] = [];
let mockWorkers: WorkerData[] = [];
let mockTimelines: Record<number, ProgressTimelineItem[]> = {};

// API Methods with Fallback to Persisted Data
export async function fetchCustomOrders(statusFilter?: string, isStaff: boolean = false): Promise<CustomOrderData[]> {
  try {
    const url = statusFilter ? `${BASE_URL}/custom-orders?status_filter=${encodeURIComponent(statusFilter)}` : `${BASE_URL}/custom-orders`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    const dbOrders: CustomOrderData[] = await res.json();

    if (Array.isArray(dbOrders)) {
      if (dbOrders.length === 0) {
        saveStoredCustomOrders([]);
        mockCustomOrders = [];
      } else {
        saveStoredCustomOrders(dbOrders);
        mockCustomOrders = dbOrders;
      }

      if (isStaff) {
        return (!statusFilter || statusFilter === 'All') ? dbOrders : dbOrders.filter(o => o.order_status === statusFilter);
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

      return (!statusFilter || statusFilter === 'All') ? userDbOrders : userDbOrders.filter(o => o.order_status === statusFilter);
    }

    const stored = isStaff ? getAllUserStoredCustomOrders() : getStoredCustomOrders();
    if (!statusFilter || statusFilter === 'All') return stored;
    return stored.filter(o => o.order_status === statusFilter);
  } catch {
    const allOrders = isStaff ? getAllUserStoredCustomOrders() : getStoredCustomOrders();
    if (!statusFilter || statusFilter === 'All') return allOrders;
    return allOrders.filter(o => o.order_status === statusFilter);
  }
}

export async function updateOrderStatus(orderId: number, status: string, estimatedPrice?: number, remarks?: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/custom-orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: status, estimated_price: estimatedPrice, remarks })
    });
    if (!res.ok) throw new Error('Failed to update status');
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
  } catch {
    const stored = getStoredCustomOrders();
    const ord = stored.find(o => o.custom_order_id === orderId) || mockCustomOrders.find(o => o.custom_order_id === orderId);
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
      mockCustomOrders = stored;
    }
    return { message: `Order #${orderId} status updated to ${status}` };
  }
}

export async function toggleLockOrderSpecifications(orderId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/custom-orders/${orderId}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to lock order');
    await res.json();
  } catch (err) {
    console.warn('DB lock request failed, fallback locally:', err);
  }

  const stored = getStoredCustomOrders();
  const ord = stored.find(o => o.custom_order_id === orderId) || mockCustomOrders.find(o => o.custom_order_id === orderId);
  if (ord) {
    ord.is_locked = true;
    if (ord.order_status === 'Pending' || ord.order_status === 'Pending Approval') {
      ord.order_status = 'Approved';
    }
    saveStoredCustomOrders(stored);
    mockCustomOrders = stored;
  }
  return true;
}

export async function cancelCustomOrder(orderId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/custom-orders/${orderId}/cancel`, {
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

  const mockTarget = mockCustomOrders.find(o => o.custom_order_id === orderId);
  if (mockTarget) {
    mockTarget.order_status = 'Cancelled';
  }

  window.dispatchEvent(new Event('custom-orders-updated'));
  return true;
}

export async function payCustomOrder(orderId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/custom-orders/${orderId}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to record payment');
    await res.json();
  } catch (err) {
    console.warn('DB pay request failed, fallback locally:', err);
  }

  const stored = getStoredCustomOrders();
  const ord = stored.find(o => o.custom_order_id === orderId) || mockCustomOrders.find(o => o.custom_order_id === orderId);
  if (ord) {
    ord.payment_status = 'Paid';
    ord.order_status = 'Paid';
    ord.is_locked = true;
    saveStoredCustomOrders(stored);
    mockCustomOrders = stored;
  }
  return true;
}

export async function fetchWorkers(): Promise<WorkerData[]> {
  try {
    const res = await fetch(`${BASE_URL}/workers`);
    if (!res.ok) throw new Error('Failed to fetch workers');
    return await res.json();
  } catch {
    return [...mockWorkers];
  }
}

export async function addWorker(fullName: string, email: string, phone?: string, specialization?: string): Promise<WorkerData> {
  try {
    const res = await fetch(`${BASE_URL}/workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, phone, specialization })
    });
    if (!res.ok) throw new Error('Failed to add worker');
    return await res.json();
  } catch {
    const newW: WorkerData = {
      worker_id: Date.now(),
      full_name: fullName,
      email,
      phone: phone || '+1 555-0000',
      specialization: specialization || 'General Artisan',
      status: true
    };
    mockWorkers.push(newW);
    return newW;
  }
}

export async function assignWorkerTask(orderId: number, workerId: number): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/assign-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_order_id: orderId, worker_id: workerId })
    });
    if (!res.ok) throw new Error('Failed to assign worker');
    return await res.json();
  } catch {
    const ord = mockCustomOrders.find(o => o.custom_order_id === orderId);
    const worker = mockWorkers.find(w => w.worker_id === workerId);
    if (ord && worker) {
      if (!ord.assigned_workers.some(w => w.worker_id === workerId)) {
        ord.assigned_workers.push({
          assignment_id: Date.now(),
          worker_id: worker.worker_id,
          worker_name: worker.full_name,
          task_status: 'Assigned'
        });
      }
      if (ord.order_status === 'Approved') {
        ord.order_status = 'In Production';
      }
    }
    return { message: `Worker assigned successfully` };
  }
}

export async function updateProductionProgress(orderId: number, stage: string, percentage: number, remarks?: string): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/update-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_order_id: orderId, stage, progress_percentage: percentage, remarks })
    });
    if (!res.ok) throw new Error('Failed to update progress');
    return await res.json();
  } catch {
    const ord = mockCustomOrders.find(o => o.custom_order_id === orderId);
    if (ord) {
      ord.current_stage = stage;
      ord.progress_percentage = percentage;
      if (remarks) ord.latest_remarks = remarks;
      if (percentage >= 100 || stage === 'Ready for Dispatch') {
        ord.order_status = 'Completed';
      } else if (ord.order_status !== 'Rejected') {
        ord.order_status = 'In Production';
      }

      if (!mockTimelines[orderId]) mockTimelines[orderId] = [];
      mockTimelines[orderId].push({
        progress_id: Date.now(),
        stage,
        progress_percentage: percentage,
        remarks,
        updated_at: new Date().toISOString()
      });
    }
    return { message: `Progress updated` };
  }
}

export async function fetchOrderTrackingTimeline(orderId: number): Promise<OrderTrackingInfo> {
  try {
    const res = await fetch(`${BASE_URL}/custom-orders/${orderId}/tracking`);
    if (!res.ok) throw new Error('Failed to fetch tracking');
    return await res.json();
  } catch {
    const ord = mockCustomOrders.find(o => o.custom_order_id === orderId);
    const timeline = mockTimelines[orderId] || [];
    return {
      custom_order_id: orderId,
      furniture_type: ord?.furniture_type || 'Custom Furniture',
      material: ord?.material || 'Standard',
      dimensions: ord?.dimensions || 'N/A',
      color: ord?.color || 'N/A',
      order_status: ord?.order_status || 'Pending',
      estimated_price: ord?.estimated_price,
      assigned_workers: ord?.assigned_workers ? ord.assigned_workers.map(w => ({ worker_name: w.worker_name, task_status: w.task_status })) : [],
      timeline
    };
  }
}

export function getFurnitureImageUrl(furnitureType: string = '', referenceImage?: string): string {
  if (referenceImage && referenceImage.startsWith('http')) {
    return referenceImage;
  }

  const type = furnitureType.toLowerCase();

  if (type.includes('table') && type.includes('dining')) {
    return 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('coffee') || (type.includes('table') && type.includes('center'))) {
    return 'https://images.unsplash.com/photo-1533779283484-8ad4940aa3a8?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('desk') || type.includes('office') || type.includes('workstation')) {
    return 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('daybed') || type.includes('bench') || type.includes('lounge')) {
    return 'https://images.unsplash.com/photo-1540518614846-7ede433c5163?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('bed') || type.includes('cot') || type.includes('headboard')) {
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('chair') || type.includes('armchair') || type.includes('seat')) {
    return 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('cabinet') || type.includes('credenza') || type.includes('sideboard') || type.includes('wardrobe')) {
    return 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80';
  }
  if (type.includes('sofa') || type.includes('couch')) {
    return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80';
  }

  return 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80';
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
  const matchedImg = getFurnitureImageUrl(furnitureType, referenceImage);

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
    reference_image: matchedImg
  };

  try {
    const res = await fetch(`${BASE_URL}/custom-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API Request Failed');
    const created: CustomOrderData = await res.json();
    const currentOrders = getStoredCustomOrders();
    saveStoredCustomOrders([created, ...currentOrders]);
    return created;
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
      reference_image: matchedImg,
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
