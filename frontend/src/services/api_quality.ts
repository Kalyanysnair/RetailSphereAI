const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/quality`;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export interface QualityJobItem {
  job_id: string; // e.g. "CUS-0041" or "FAB-0007"
  numeric_id: number;
  order_type: 'Custom' | 'Fabrication' | string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  job_title: string;
  specifications: {
    dimensions?: string;
    material?: string;
    color?: string;
    design_description?: string;
    reference_image?: string;
    quantity?: number;
    material_source?: string;
    requirements?: string;
    drawing_image?: string;
    cutting_layout?: string;
    estimated_price?: number;
  };
  production_status: string;
  production_staff_name: string;
  completion_date?: string | null;
  qc_status:
    | 'QC_PENDING'
    | 'QC_PASSED'
    | 'QC_FAILED'
    | 'REWORK_IN_PROGRESS'
    | 'REWORK_COMPLETED'
    | 'READY_FOR_PACKING'
    | 'READY_FOR_DISPATCH'
    | 'DISPATCHED'
    | string;
  latest_inspection?: {
    inspection_id: number;
    inspector_id: number;
    inspector_name: string;
    result: 'PASS' | 'FAIL';
    checklist: {
      dimensions: boolean;
      finishing: boolean;
      structure: boolean;
      specifications: boolean;
      material?: boolean;
      functionality?: boolean;
      fabrication?: boolean;
      customer_specs?: boolean;
    };
    checklist_details?: Record<string, any>;
    inspection_notes?: string;
    photos?: string;
    inspected_at?: string;
  } | null;
  active_rework_ticket?: {
    rework_id: number;
    ticket_code: string;
    status: string;
    source: string;
    responsibility_type?: string;
    rework_reason: string;
    required_changes?: string;
    transportation_mode?: string;
    additional_cost?: number;
    quotation_status?: string;
    payment_status?: string;
    assigned_worker_name?: string;
    created_at?: string;
  } | null;
  can_dispatch: boolean;
  dispatch_blocked: boolean;
  dispatch_block_reason?: string | null;
}

export interface QualityInspectionItem {
  inspection_id: number;
  order_type: 'Custom' | 'Fabrication' | 'Readymade' | string;
  order_id: number;
  stage_id?: number | null;
  inspector_id: number;
  inspector_name: string;
  result: 'PASS' | 'FAIL';
  checklist: {
    dimensions: boolean;
    finishing: boolean;
    structure: boolean;
    specifications: boolean;
    material?: boolean;
    functionality?: boolean;
    fabrication?: boolean;
    customer_specs?: boolean;
  };
  checklist_details?: Record<string, any>;
  inspection_notes?: string;
  photos?: string;
  rework_ticket_id?: number | null;
  inspected_at?: string;
}

export interface ReworkTicketItem {
  rework_id: number;
  id?: number;
  custom_order_id?: number;
  fabrication_id?: number;
  ticket_code: string;
  inspection_id?: number;
  repeat_inspection_id?: number;
  order_type: 'Custom' | 'Fabrication' | string;
  order_id: number;
  display_order_id?: string;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  source: 'QC_FAILURE' | 'CUSTOMER_REQUEST' | string;
  approved_specifications?: Record<string, any>;
  issue_description?: string;
  defect_description?: string;
  issue_category?: string;
  evidence_photos?: string;
  evidence_photo_url?: string;
  responsibility_type: 'RETAILSPHERE_ERROR' | 'CUSTOMER_CHANGE' | 'UNCLEAR_DISPUTED' | 'UNDER_ASSESSMENT' | string;
  responsibility?: string;
  responsibility_notes?: string;
  assessed_by_name?: string;
  assessed_at?: string;
  rework_reason: string;
  required_changes?: string;
  transportation_mode: 'INTERNAL_FLEET' | 'CARRIER_PARTNER' | 'STORE_DROP_OFF' | 'CUSTOMER_COLLECTS' | string;
  transportation_cost?: number;
  pickup_dropoff_arranged?: string;
  additional_cost: number;
  quotation_status: 'NOT_APPLICABLE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | string;
  customer_decision?: string;
  quotation_notes?: string;
  payment_status: 'NOT_REQUIRED' | 'PENDING' | 'PAID' | string;
  payment_reference?: string;
  assigned_worker_id?: number;
  assigned_worker_name?: string;
  worker_name?: string;
  assigned_supervisor_name?: string;
  vehicle_code?: string;
  carrier_name?: string;
  status:
    | 'OPEN'
    | 'UNDER_ASSESSMENT'
    | 'AWAITING_CUSTOMER_DECISION'
    | 'AWAITING_PICKUP'
    | 'RECEIVED_AT_STORE'
    | 'REWORK_IN_PROGRESS'
    | 'REWORK_COMPLETED'
    | 'QC_PENDING'
    | 'QC_PASSED'
    | 'READY_FOR_DISPATCH'
    | 'CLOSED'
    | 'CANCELLED'
    | string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  initial_inspection_result?: string;
  repeat_inspection_result?: string;
  quotation_breakdown?: {
    material_cost: number;
    labour_cost: number;
    machine_cost: number;
    finishing_cost: number;
    transportation_cost: number;
    total_amount: number;
    notes?: string;
    version: number;
  } | null;
  itemized_quotation?: {
    material_cost?: number;
    labour_cost?: number;
    machine_cost?: number;
    finishing_cost?: number;
    transportation_cost?: number;
    total_amount?: number;
  } | null;
}

export interface TransportOptions {
  available_fleet_vehicles: Array<{
    vehicle_id: number;
    registration_number: string;
    vehicle_type: string;
    assigned_driver_name: string;
    status: string;
  }>;
  active_carrier_partners: Array<{
    carrier_id: number;
    carrier_name: string;
    phone: string;
    coverage_areas?: string;
  }>;
}

// 1. Fetch QC Jobs
export async function fetchQualityControlJobsApi(): Promise<QualityJobItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/jobs`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch QC jobs:', err);
  }
  return [];
}

// 2. Fetch Inspections
export async function fetchQualityInspectionsApi(orderType?: string, orderId?: number, result?: string): Promise<QualityInspectionItem[]> {
  try {
    const params = new URLSearchParams();
    if (orderType && orderType !== 'All') params.append('order_type', orderType);
    if (orderId) params.append('order_id', String(orderId));
    if (result && result !== 'All') params.append('result', result);

    const qs = params.toString();
    const url = `${BASE_URL}/inspections${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch quality inspections:', err);
  }
  return [];
}

// 3. Record QC Inspection
export async function recordQualityInspectionApi(payload: {
  order_type: string;
  order_id: number;
  stage_id?: number;
  inspector_id?: number;
  result: 'PASS' | 'FAIL';
  dimensions_check?: boolean;
  finishing_check?: boolean;
  structure_check?: boolean;
  specifications_check?: boolean;
  material_check?: boolean;
  functionality_check?: boolean;
  fabrication_check?: boolean;
  customer_specs_check?: boolean;
  checklist_details?: Record<string, any>;
  inspection_notes?: string;
  photos?: string;
  rework_worker_id?: number;
  rework_reason?: string;
  responsible_team?: string;
  is_repeat?: boolean;
  rework_ticket_id?: number;
}): Promise<{ message: string; inspection_id: number; result: string; rework_ticket_id?: number; rework_ticket_code?: string }> {
  const res = await fetch(`${BASE_URL}/inspections`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record QC inspection' }));
    throw new Error(err.detail || 'Failed to record QC inspection');
  }
  return await res.json();
}

// 4. Fetch Rework Tickets
export async function fetchReworkTicketsApi(statusFilter?: string, orderType?: string, customerId?: number): Promise<ReworkTicketItem[]> {
  try {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'All') params.append('status_filter', statusFilter);
    if (orderType && orderType !== 'All') params.append('order_type', orderType);
    if (customerId) params.append('customer_id', String(customerId));

    const qs = params.toString();
    const url = `${BASE_URL}/rework-tickets${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch rework tickets:', err);
  }
  return [];
}

// 5. Fetch Single Rework Ticket Details
export async function fetchReworkTicketDetailsApi(ticketId: number): Promise<ReworkTicketItem> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch rework ticket' }));
    throw new Error(err.detail || 'Failed to fetch rework ticket');
  }
  return await res.json();
}

// 6. Submit Customer Rework Request
export async function submitCustomerReworkRequestApi(payload: {
  order_type: string;
  order_id: number;
  issue_description: string;
  reported_issue_type?: string;
  evidence_photos?: string;
  preferred_transport?: string;
}): Promise<{ message: string; ticket_code: string; rework_id: number; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/customer-request`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit rework request' }));
    throw new Error(err.detail || 'Failed to submit rework request');
  }
  return await res.json();
}

// 7. Assess Responsibility
export async function assessReworkResponsibilityApi(
  ticketId: number,
  payload: {
    responsibility_type: 'RETAILSPHERE_ERROR' | 'CUSTOMER_CHANGE' | 'UNCLEAR_DISPUTED';
    responsibility_notes: string;
    required_changes?: string;
    transportation_mode?: string;
    vehicle_id?: number;
    carrier_id?: number;
  }
): Promise<{ message: string; ticket_code: string; responsibility_type: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/assess`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to assess responsibility' }));
    throw new Error(err.detail || 'Failed to assess responsibility');
  }
  return await res.json();
}

// 8. Resolve Dispute (Admin)
export async function resolveReworkDisputeApi(
  ticketId: number,
  payload: { resolution: 'RETAILSPHERE_ERROR' | 'CUSTOMER_CHANGE'; resolution_notes: string }
): Promise<{ message: string; ticket_code: string; responsibility_type: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/resolve-dispute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve dispute' }));
    throw new Error(err.detail || 'Failed to resolve dispute');
  }
  return await res.json();
}

// 9. Create Quotation for Customer-Paid Rework
export async function createReworkQuotationApi(
  ticketId: number,
  payload: {
    material_cost: number;
    labour_cost: number;
    machine_cost: number;
    finishing_cost: number;
    transportation_cost: number;
    notes?: string;
    estimated_duration?: string;
  }
): Promise<{ message: string; ticket_code: string; total_amount: number; version: number; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/quotation`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create quotation' }));
    throw new Error(err.detail || 'Failed to create quotation');
  }
  return await res.json();
}

// 10. Customer Decision on Quotation
export async function submitCustomerDecisionApi(
  ticketId: number,
  payload: { decision: 'APPROVE' | 'REJECT'; notes?: string; selected_transport?: string }
): Promise<{ message: string; ticket_code: string; quotation_status: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/customer-decision`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record decision' }));
    throw new Error(err.detail || 'Failed to record decision');
  }
  return await res.json();
}

// 11. Pay Rework Quotation
export async function payReworkQuotationApi(
  ticketId: number,
  payload: { payment_reference?: string; payment_method?: string; amount?: number }
): Promise<{ message: string; ticket_code: string; payment_status: string; payment_reference: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/pay`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to process payment' }));
    throw new Error(err.detail || 'Failed to process payment');
  }
  return await res.json();
}

// 12. Record Item Store Receipt
export async function recordItemStoreReceiptApi(ticketId: number): Promise<{ message: string; ticket_code: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/record-receipt`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record receipt' }));
    throw new Error(err.detail || 'Failed to record receipt');
  }
  return await res.json();
}

// 13. Assign Worker for Rework
export async function assignReworkWorkerApi(
  ticketId: number,
  payload: { assigned_worker_id: number; assigned_supervisor_id?: number; instructions?: string }
): Promise<{ message: string; ticket_code: string; worker_name: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/assign-worker`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to assign worker' }));
    throw new Error(err.detail || 'Failed to assign worker');
  }
  return await res.json();
}

// 14. Complete Rework Production
export async function completeReworkProductionApi(
  ticketId: number,
  payload: { notes?: string }
): Promise<{ message: string; ticket_code: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/complete-rework`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to complete rework' }));
    throw new Error(err.detail || 'Failed to complete rework');
  }
  return await res.json();
}

// 15. Dispatch Rework Redelivery
export async function dispatchReworkRedeliveryApi(
  ticketId: number,
  payload: { transportation_mode?: string; vehicle_id?: number; driver_id?: number; carrier_id?: number; tracking_number?: string; dispatch_notes?: string }
): Promise<{ message: string; ticket_code: string; status: string }> {
  const res = await fetch(`${BASE_URL}/rework/${ticketId}/dispatch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to dispatch redelivery' }));
    throw new Error(err.detail || 'Failed to dispatch redelivery');
  }
  return await res.json();
}

// 16. Fetch Transport Options
export async function fetchQualityTransportOptionsApi(): Promise<TransportOptions> {
  try {
    const res = await fetch(`${BASE_URL}/fleet-carriers`, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch transport options:', err);
  }
  return { available_fleet_vehicles: [], active_carrier_partners: [] };
}

// Backward-compatibility and convenience aliases
export type ReworkJobItem = ReworkTicketItem;
export const fetchReworkJobsApi = fetchReworkTicketsApi;
export const resolveReworkJobApi = (ticketId: number, notes?: string | { notes?: string }) =>
  completeReworkProductionApi(ticketId, typeof notes === 'string' ? { notes } : (notes || {}));
export const createCustomerReworkRequestApi = (payload: {
  order_type: string;
  order_id: number;
  defect_description: string;
  issue_category?: string;
  evidence_photo_url?: string;
  transportation_preference?: string;
}) =>
  submitCustomerReworkRequestApi({
    order_type: payload.order_type,
    order_id: payload.order_id,
    issue_description: payload.defect_description,
    reported_issue_type: payload.issue_category,
    evidence_photos: payload.evidence_photo_url,
    preferred_transport: payload.transportation_preference
  });
export const customerDecisionReworkTicketApi = (ticketId: number, approved: boolean) =>
  submitCustomerDecisionApi(ticketId, { decision: approved ? 'APPROVE' : 'REJECT' });
export const payReworkTicketApi = (ticketId: number, paymentRef: string) =>
  payReworkQuotationApi(ticketId, { payment_reference: paymentRef });
