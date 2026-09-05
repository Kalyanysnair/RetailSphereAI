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
