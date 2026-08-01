const BASE_URL = 'http://localhost:8000/api';

export interface UserSignupPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  role_name: string;
  status: boolean;
  created_at: string;
  customer?: {
    customer_id: number;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export async function signupUser(payload: UserSignupPayload): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Signup failed' }));
    let errorMsg = 'Failed to sign up';
    if (typeof errorData.detail === 'string') {
      errorMsg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMsg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
    throw new Error(errorMsg);
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function loginUser(payload: UserLoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
    let errorMsg = 'Invalid username or password';
    if (typeof errorData.detail === 'string') {
      errorMsg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMsg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
    throw new Error(errorMsg);
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function requestForgotPassword(email: string): Promise<{ message: string; reset_code?: string }> {
  const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || 'Email not found');
  }

  return await response.json();
}

export async function resetUserPassword(email: string, reset_code: string, new_password: string): Promise<{ message: string }> {
  const response = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, reset_code, new_password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Password reset failed' }));
    throw new Error(errorData.detail || 'Failed to reset password');
  }

  return await response.json();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    const response = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return null;
    }

    const data: UserProfile = await response.json();
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

export function logoutUser(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

export interface GoogleLoginPayload {
  email?: string;
  full_name?: string;
  google_token?: string;
}

export async function googleLoginUser(payload: GoogleLoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/auth/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Google Sign-in failed' }));
    throw new Error(errorData.detail || 'Google authentication failed');
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  phone?: string;
  role_name: string;
  password?: string;
}

export async function createStaffUser(payload: CreateStaffPayload): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/admin/create-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to create staff member' }));
      let msg = 'Failed to create staff member';
      if (typeof errorData.detail === 'string') {
        msg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        msg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      throw new Error('Server connection temporarily interrupted. Please click "Create & Send Email" again.');
    }
    throw err;
  }
}

export async function fetchStaffUsers(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/staff`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function updateUserProfile(payload: {
  full_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): Promise<UserProfile> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(err.detail || 'Failed to update profile');
  }

  const updated: UserProfile = await response.json();
  localStorage.setItem('user', JSON.stringify(updated));
  return updated;
}

export async function fetchInventoryFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/inventory`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function createProductInDB(payload: {
  name: string;
  category: string;
  material: string;
  price: number;
  stock_count: number;
  image_url?: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create product in DB');
  }
  return await response.json();
}


export async function updateStockInDB(productId: number, stockCount: number): Promise<void> {
  await fetch(`${BASE_URL}/admin/inventory/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_count: stockCount }),
  });
}

export async function fetchQueriesFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/queries`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('API error fetching queries from DB:', err);
  }
  return [];
}

export async function createStaffQueryInDB(payload: {
  staff_name: string;
  staff_email: string;
  category: string;
  subject: string;
  message: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/queries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to submit query to DB');
  }
  return await response.json();
}

export async function respondToStaffQueryInDB(queryId: number, adminResponse: string, status: string): Promise<void> {
  await fetch(`${BASE_URL}/admin/queries/${queryId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_response: adminResponse, status }),
  });
}

export async function fetchNotificationsFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/notifications`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('API error fetching notifications from DB:', err);
  }
  return [];
}




