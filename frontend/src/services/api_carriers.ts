export interface CarrierPartner {
  carrier_id: number;
  carrier_name: string;
  contact_phone: string;
  contact_email?: string | null;
  status: boolean;
  created_at?: string;
}

export interface CarrierPartnerCreate {
  carrier_name: string;
  contact_phone: string;
  contact_email?: string;
  status?: boolean;
}

export interface CarrierPartnerUpdate {
  carrier_name?: string;
  contact_phone?: string;
  contact_email?: string;
  status?: boolean;
}

export async function getCarrierPartnersApi(): Promise<CarrierPartner[]> {
  try {
    const res = await fetch('/api/admin/carriers');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error fetching carrier partners:', err);
  }
  return [];
}

export async function createCarrierPartnerApi(data: CarrierPartnerCreate): Promise<CarrierPartner | null> {
  try {
    const res = await fetch('/api/admin/carriers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error creating carrier partner:', err);
  }
  return null;
}

export async function updateCarrierPartnerApi(id: number, data: CarrierPartnerUpdate): Promise<CarrierPartner | null> {
  try {
    const res = await fetch(`/api/admin/carriers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error(`Error updating carrier partner #${id}:`, err);
  }
  return null;
}

export async function deleteCarrierPartnerApi(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/carriers/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error(`Error deleting carrier partner #${id}:`, err);
  }
  return false;
}

export async function resendCarrierCredentialsApi(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/admin/carriers/${id}/resend-credentials`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: data.message || 'Credentials sent successfully.' };
    } else {
      return { success: false, message: data.detail || 'Failed to send credentials.' };
    }
  } catch (err: any) {
    console.error(`Error resending credentials for carrier #${id}:`, err);
    return { success: false, message: err?.message || 'Network error while sending credentials.' };
  }
}

export interface CarrierPersonnelItem {
  personnel_id: number;
  carrier_id: number;
  carrier_name: string;
  name: string;
  phone: string;
  email?: string | null;
  vehicle_type: string;
  vehicle_reg: string;
  status: string;
  notes?: string | null;
  user_id?: number | null;
  active_tasks_count: number;
  completed_tasks_count: number;
  total_tasks_count: number;
  created_at?: string | null;
}

export async function getAllCarrierPersonnelApi(): Promise<CarrierPersonnelItem[]> {
  try {
    const res = await fetch('/api/admin/carrier-personnel');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error fetching carrier personnel:', err);
  }
  return [];
}

export async function resendPersonnelCredentialsAdminApi(id: number): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/admin/carrier-personnel/${id}/resend-credentials`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: data.message || 'Credentials dispatched successfully.' };
    } else {
      return { success: false, message: data.detail || 'Failed to dispatch credentials.' };
    }
  } catch (err: any) {
    console.error(`Error resending credentials for personnel #${id}:`, err);
    return { success: false, message: err?.message || 'Network error while sending credentials.' };
  }
}

export async function togglePersonnelStatusAdminApi(id: number, status: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/admin/carrier-personnel/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: data.message || 'Status updated successfully.' };
    } else {
      return { success: false, message: data.detail || 'Failed to update status.' };
    }
  } catch (err: any) {
    console.error(`Error updating status for personnel #${id}:`, err);
    return { success: false, message: err?.message || 'Network error while updating status.' };
  }
}


