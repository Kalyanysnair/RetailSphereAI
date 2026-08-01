export interface StaffQuery {
  id: string;
  staffName: string;
  staffEmail: string;
  category: 'Email Change Request' | 'Role & Access Permission' | 'General Query';
  subject: string;
  message: string;
  status: 'Pending' | 'In Review' | 'Approved' | 'Resolved';
  adminResponse?: string;
  createdAt: string;
  updatedAt?: string;
}

const QUERIES_KEY = 'retailsphere_staff_queries';

export const INITIAL_QUERIES: StaffQuery[] = [];

export const getStaffQueries = (): StaffQuery[] => {
  try {
    const raw = localStorage.getItem(QUERIES_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading staff queries:', err);
    return [];
  }
};


export const addStaffQuery = (queryData: Omit<StaffQuery, 'id' | 'createdAt' | 'status'>): StaffQuery => {
  const existing = getStaffQueries();
  const newQuery: StaffQuery = {
    ...queryData,
    id: `query-${Date.now()}`,
    status: 'Pending',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };
  const updated = [newQuery, ...existing];
  localStorage.setItem(QUERIES_KEY, JSON.stringify(updated));
  return newQuery;
};

export const respondToStaffQuery = (
  id: string,
  adminResponse: string,
  status: 'Pending' | 'In Review' | 'Approved' | 'Resolved'
): StaffQuery[] => {
  const existing = getStaffQueries();
  const updated = existing.map((q) => {
    if (q.id === id) {
      return {
        ...q,
        adminResponse,
        status,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
    }
    return q;
  });
  localStorage.setItem(QUERIES_KEY, JSON.stringify(updated));
  return updated;
};
