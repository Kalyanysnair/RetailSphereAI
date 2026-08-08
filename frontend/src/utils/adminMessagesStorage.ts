export interface AdminMessage {
  id: string;
  sender: string;
  recipientType: 'All Staff' | 'Retail Staff' | 'Production Staff' | 'Specific Staff' | 'All Suppliers' | 'Specific Supplier';
  targetEmail?: string;
  subject: string;
  message: string;
  createdDate: string;
  read: boolean;
}

const STORAGE_KEY = 'retailsphere_admin_broadcast_messages';

const INITIAL_MESSAGES: AdminMessage[] = [
  {
    id: 'msg-101',
    sender: 'System Admin',
    recipientType: 'All Staff',
    subject: 'Store Inventory Count & Seasonal Refresh',
    message: 'Team, please ensure all living room and bedroom items stock counts are updated before end of week.',
    createdDate: new Date(Date.now() - 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    read: false,
  },
  {
    id: 'msg-102',
    sender: 'System Admin',
    recipientType: 'All Suppliers',
    subject: 'Q3 Ready-Made Furniture Production Procurement',
    message: 'To all manufacturing partners: New stock deliveries for teak and marble collections are scheduled for dispatch.',
    createdDate: new Date(Date.now() - 172800000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    read: false,
  }
];

export const getStoredAdminMessages = (): AdminMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MESSAGES));
      return INITIAL_MESSAGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MESSAGES;
  }
};

export const sendAdminMessage = (msgData: Omit<AdminMessage, 'id' | 'createdDate' | 'read'>): AdminMessage => {
  const current = getStoredAdminMessages();
  const newMsg: AdminMessage = {
    ...msgData,
    id: `msg-${Date.now()}`,
    createdDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    read: false,
  };
  const updated = [newMsg, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newMsg;
};

export const getMessagesForUser = (userEmail: string, role: string): AdminMessage[] => {
  const all = getStoredAdminMessages();
  return all.filter(msg => {
    if (msg.recipientType === 'All Staff') return role === 'Retail Staff' || role === 'Production Staff' || role === 'Staff';
    if (msg.recipientType === 'Retail Staff') return role === 'Retail Staff';
    if (msg.recipientType === 'Production Staff') return role === 'Production Staff';
    if (msg.recipientType === 'All Suppliers') return role === 'Supplier' || role === 'Vendor';
    if (msg.recipientType === 'Specific Staff' || msg.recipientType === 'Specific Supplier') {
      return msg.targetEmail?.toLowerCase().trim() === userEmail.toLowerCase().trim();
    }
    return false;
  });
};

export const markAdminMessageRead = (msgId: string) => {
  const current = getStoredAdminMessages();
  const updated = current.map(m => m.id === msgId ? { ...m, read: true } : m);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
