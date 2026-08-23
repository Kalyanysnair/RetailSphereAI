export interface RetailDashboardSummary {
  today: {
    new_orders: number;
    pending_reviews: number;
    to_pack: number;
    ready_to_dispatch: number;
    out_for_delivery: number;
    return_requests: number;
  };
  inbox_counts: {
    new_customizations: number;
    new_fabrication: number;
    new_onsite_requests: number;
  };
  priority_items: Array<{
    id: string;
    type: string;
    customer_name: string;
    title: string;
    status: string;
    priority: string;
    action: string;
  }>;
  recent_activity: Array<{
    time?: string;
    text: string;
    category: string;
  }>;
}

export interface RequestInboxItem {
  request_id: string;
  numeric_id: number;
  type: 'CUSTOMIZATION' | 'FABRICATION' | 'ON-SITE SERVICES';
  customer_name: string;
  customer_email: string;
  title: string;
  material?: string;
  dimensions?: string;
  color?: string;
  quantity?: number;
  description?: string;
  reference_image?: string;
  estimated_price?: number;
  date?: string;
  review_status: string;
  order_status?: string;
  priority: string;
  review_notes?: string;
  address?: string;
  city?: string;
  pincode?: string;
  preferred_date?: string;
  preferred_time?: string;
}

export interface UniversalRequestMessage {
  message_id: number;
  request_type: string;
  request_id: number;
  sender_id?: number;
  sender_role: string;
  sender_name: string;
  message: string;
  created_at?: string;
}

// 1. Fetch Operational Summary Metrics
export async function fetchRetailDashboardSummary(): Promise<RetailDashboardSummary | null> {
  try {
    const res = await fetch('/api/retail-staff/dashboard/summary');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error fetching retail dashboard summary:', err);
  }
  return null;
}

// 2. Fetch Request Inbox
export async function fetchRequestInbox(
  categoryFilter: string = 'ALL',
  statusFilter: string = 'ALL'
): Promise<RequestInboxItem[]> {
  try {
    const query = new URLSearchParams({
      category_filter: categoryFilter,
      status_filter: statusFilter,
    });
    const res = await fetch(`/api/retail-staff/request-inbox?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error fetching request inbox:', err);
  }
  return [];
}

// 3. Review Customization Request
export async function reviewCustomizationRequestAPI(
  customOrderId: number,
  reviewStatus: 'APPROVED' | 'MORE_INFO_REQUESTED' | 'REJECTED' | 'UNDER_REVIEW',
  staffId: number = 1,
  reviewNotes?: string,
  priority: string = 'NORMAL'
): Promise<boolean> {
  try {
    const res = await fetch(`/api/retail-staff/customizations/${customOrderId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        review_status: reviewStatus,
        review_notes: reviewNotes,
        priority,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error reviewing custom order ${customOrderId}:`, err);
    return false;
  }
}

// 4. Review Fabrication Request
export async function reviewFabricationRequestAPI(
  fabricationId: number,
  reviewStatus: 'APPROVED' | 'MORE_INFO_REQUESTED' | 'REJECTED' | 'UNDER_REVIEW',
  staffId: number = 1,
  reviewNotes?: string,
  priority: string = 'NORMAL'
): Promise<boolean> {
  try {
    const res = await fetch(`/api/retail-staff/fabrication/${fabricationId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        review_status: reviewStatus,
        review_notes: reviewNotes,
        priority,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error reviewing fabrication request ${fabricationId}:`, err);
    return false;
  }
}

// 5. Review Service Request
export async function reviewServiceRequestAPI(
  serviceId: number,
  reviewStatus: 'APPROVED' | 'MORE_INFO_REQUESTED' | 'REJECTED' | 'UNDER_REVIEW',
  staffId: number = 1,
  reviewNotes?: string,
  priority: string = 'NORMAL'
): Promise<boolean> {
  try {
    const res = await fetch(`/api/retail-staff/services/${serviceId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        review_status: reviewStatus,
        review_notes: reviewNotes,
        priority,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error reviewing service booking ${serviceId}:`, err);
    return false;
  }
}

// 6. Request Messages (Universal Customer Communication)
export async function fetchRequestMessagesAPI(
  requestType: string,
  requestId: number
): Promise<UniversalRequestMessage[]> {
  try {
    const res = await fetch(`/api/retail-staff/messages/${requestType}/${requestId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Error fetching request messages for ${requestType}/${requestId}:`, err);
  }
  return [];
}

export async function sendRequestMessageAPI(
  requestType: string,
  requestId: number,
  senderRole: string,
  senderName: string,
  message: string,
  senderId?: number
): Promise<boolean> {
  try {
    const res = await fetch(`/api/retail-staff/messages/${requestType}/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: senderId,
        sender_role: senderRole,
        sender_name: senderName,
        message,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error sending message for ${requestType}/${requestId}:`, err);
    return false;
  }
}
