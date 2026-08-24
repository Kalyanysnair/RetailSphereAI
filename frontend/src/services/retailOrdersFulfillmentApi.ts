export interface FulfillmentSummary {
  to_pack: number;
  packed: number;
  to_dispatch: number;
  dispatched: number;
  out_for_delivery: number;
  delivered: number;
  returns: number;
  total_orders: number;
}

export interface StatusHistoryItem {
  history_id: number;
  previous_status?: string;
  new_status: string;
  changed_by_role?: string;
  changed_at?: string;
  note?: string;
}

export interface FulfillmentInfo {
  fulfillment_id: number;
  fulfillment_status: string;
  packed_at?: string;
  packing_notes?: string;
  dispatched_at?: string;
  carrier?: string;
  tracking_number?: string;
  expected_delivery_date?: string;
  delivery_status?: string;
  delivered_at?: string;
  delivery_notes?: string;
}

export interface ReturnRequestInfo {
  return_id: number;
  reason: string;
  description?: string;
  photo_url?: string;
  status: string;
  requested_at?: string;
  pickup_date?: string;
  refund_status?: string;
  refund_amount?: number;
  notes?: string;
}

export interface CancellationInfo {
  cancellation_id: number;
  cancelled_by_role: string;
  reason?: string;
  cancelled_at?: string;
}

export interface FulfillmentDetails {
  orderId: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  delivery_address?: string;
  order_date?: string;
  fulfillment?: FulfillmentInfo;
  history: StatusHistoryItem[];
  return_request?: ReturnRequestInfo;
  cancellation?: CancellationInfo;
}

export interface OrderMessageItem {
  message_id: number;
  sender_id?: number;
  sender_role: string;
  sender_name: string;
  message: string;
  created_at?: string;
  read_at?: string;
}

export interface ReturnRequestRecord {
  return_id: number;
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  reason: string;
  description?: string;
  photo_url?: string;
  status: string;
  requested_at?: string;
  pickup_date?: string;
  refund_status?: string;
  refund_amount?: number;
  notes?: string;
}

// 1. Fetch Summary Statistics for Retail Staff
export async function fetchFulfillmentSummary(): Promise<FulfillmentSummary> {
  try {
    const res = await fetch('/api/orders/fulfillment/summary');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error fetching fulfillment summary:', err);
  }
  return {
    to_pack: 0,
    packed: 0,
    to_dispatch: 0,
    dispatched: 0,
    out_for_delivery: 0,
    delivered: 0,
    returns: 0,
    total_orders: 0,
  };
}

// 2. Fetch Full Fulfillment Details for single order
export async function fetchOrderFulfillmentDetails(orderIdStr: string): Promise<FulfillmentDetails | null> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/fulfillment-details`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Error fetching fulfillment details for ${orderIdStr}:`, err);
  }
  return null;
}

// 3. Mark Order Packed with Checklist & Staff Notes
export async function markOrderPackedAPI(
  orderIdStr: string,
  staffId?: number,
  packingNotes?: string,
  checklist?: Record<string, boolean>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/pack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        packing_notes: packingNotes,
        checklist,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error marking order ${orderIdStr} packed:`, err);
    return false;
  }
}

// 4. Dispatch Order with Carrier, Tracking & Expected Date
export async function dispatchOrderAPI(
  orderIdStr: string,
  carrier: string,
  trackingNumber: string,
  expectedDeliveryDate: string,
  staffId?: number,
  dispatchNote?: string,
  vehicleId?: number,
  driverId?: number
): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        carrier,
        tracking_number: trackingNumber,
        expected_delivery_date: expectedDeliveryDate,
        dispatch_note: dispatchNote,
        vehicle_id: vehicleId,
        driver_id: driverId,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error dispatching order ${orderIdStr}:`, err);
    return false;
  }
}

// 5. Update Delivery Status (Out for Delivery, Delivered, Delayed)
export async function updateDeliveryStatusAPI(
  orderIdStr: string,
  deliveryStatus: string,
  staffId?: number,
  note?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/delivery-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        delivery_status: deliveryStatus,
        note,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error updating delivery status for ${orderIdStr}:`, err);
    return false;
  }
}

// 6. Fetch Order History Audit Log
export async function fetchOrderHistoryAPI(orderIdStr: string): Promise<StatusHistoryItem[]> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/history`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Error fetching order history for ${orderIdStr}:`, err);
  }
  return [];
}

// 7. Order Messages (Chat)
export async function fetchOrderMessagesAPI(orderIdStr: string): Promise<OrderMessageItem[]> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/messages`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Error fetching order messages for ${orderIdStr}:`, err);
  }
  return [];
}

export async function sendOrderMessageAPI(
  orderIdStr: string,
  senderRole: string,
  senderName: string,
  message: string,
  senderId?: number
): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/messages`, {
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
    console.error(`Error sending message for ${orderIdStr}:`, err);
    return false;
  }
}

// 8. Order Cancellation
export async function cancelOrderAPI(
  orderIdStr: string,
  reason: string,
  userId?: number,
  role: string = 'Customer'
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        role,
        reason,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.detail || 'Cancellation failed' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Server error' };
  }
}

// 9. Order Return Request
export async function submitReturnRequestAPI(
  orderIdStr: string,
  customerId: number,
  reason: string,
  description?: string,
  photoUrl?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/orders/${orderIdStr}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        reason,
        description,
        photo_url: photoUrl,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.detail || 'Return request failed' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Server error' };
  }
}

// 10. Return Management APIs for Staff
export async function fetchAllReturnRequestsAPI(): Promise<ReturnRequestRecord[]> {
  try {
    const res = await fetch('/api/orders/returns/all');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error fetching all return requests:', err);
  }
  return [];
}

export async function updateReturnStatusAPI(
  returnId: number,
  status: string,
  staffId?: number,
  pickupDate?: string,
  refundStatus?: string,
  refundAmount?: number,
  notes?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/returns/${returnId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffId,
        status,
        pickup_date: pickupDate,
        refund_status: refundStatus,
        refund_amount: refundAmount,
        notes,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Error updating return status for ${returnId}:`, err);
    return false;
  }
}
