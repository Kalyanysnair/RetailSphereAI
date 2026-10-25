export interface AdminMessage {
  id: string;
  sender: string;
  recipientType: 'All Staff' | 'Retail Staff' | 'Production Staff' | 'Specific Staff';
  targetEmail?: string;
  subject: string;
  message: string;
  createdDate: string;
  read: boolean;
  readByEmails?: string[];
  readAt?: string;
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
    readByEmails: [],
  }
];

export const getStoredAdminMessages = (): AdminMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MESSAGES));
      return INITIAL_MESSAGES;
    }
    const parsed: any[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MESSAGES));
      return INITIAL_MESSAGES;
    }
    // Filter out messages for recipient types that do not have dashboards (e.g. Suppliers)
    const validStaffMessages: AdminMessage[] = parsed.filter(m =>
      m.recipientType === 'All Staff' ||
      m.recipientType === 'Retail Staff' ||
      m.recipientType === 'Production Staff' ||
      m.recipientType === 'Specific Staff'
    );
    if (validStaffMessages.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validStaffMessages));
    }
    return validStaffMessages;
  } catch {
    return INITIAL_MESSAGES;
  }
};

export const deleteAdminMessage = (msgId: string): AdminMessage[] => {
  const current = getStoredAdminMessages();
  const updated = current.filter(m => m.id !== msgId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('admin-messages-updated'));
  return updated;
};

export const sendAdminMessage = (msgData: Omit<AdminMessage, 'id' | 'createdDate' | 'read' | 'readByEmails'>): AdminMessage => {
  const current = getStoredAdminMessages();
  const newMsg: AdminMessage = {
    ...msgData,
    id: `msg-${Date.now()}`,
    createdDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    read: false,
    readByEmails: [],
  };
  const updated = [newMsg, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('admin-messages-updated'));
  return newMsg;
};

export const getMessagesForUser = (userEmail: string, role: string): AdminMessage[] => {
  const all = getStoredAdminMessages();
  return all.filter(msg => {
    if (msg.recipientType === 'All Staff') {
      return role === 'Retail Staff' || role === 'Production Staff' || role === 'Staff' || role === 'Worker' || role === 'Artisan Worker';
    }
    if (msg.recipientType === 'Retail Staff') return role === 'Retail Staff';
    if (msg.recipientType === 'Production Staff') return role === 'Production Staff' || role === 'Worker' || role === 'Artisan Worker';
    if (msg.recipientType === 'Specific Staff') {
      return msg.targetEmail?.toLowerCase().trim() === userEmail.toLowerCase().trim();
    }
    return false;
  });
};

const READ_MESSAGES_KEY = 'retailsphere_read_admin_message_ids';

const getLocalReadMessageIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_MESSAGES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
};

const saveLocalReadMessageId = (id: string) => {
  try {
    const set = getLocalReadMessageIds();
    set.add(id);
    localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

export const markAdminMessageRead = (msgId: string, userEmail?: string) => {
  saveLocalReadMessageId(msgId);
  const cleanEmail = userEmail?.trim().toLowerCase();
  const current = getStoredAdminMessages();
  const updated = current.map(m => {
    if (m.id === msgId) {
      const readBy = m.readByEmails || [];
      const updatedReadBy = cleanEmail && !readBy.map(e => e.trim().toLowerCase()).includes(cleanEmail) 
        ? [...readBy, cleanEmail] 
        : readBy;
      return {
        ...m,
        read: true,
        readByEmails: updatedReadBy,
        readAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      };
    }
    return m;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('admin-messages-updated'));
};

export const markAllAdminMessagesReadForUser = (userEmail: string, role: string) => {
  const cleanEmail = userEmail?.trim().toLowerCase();
  const userMsgs = getMessagesForUser(userEmail, role);
  userMsgs.forEach(m => saveLocalReadMessageId(m.id));
  
  const current = getStoredAdminMessages();
  const userMsgIds = new Set(userMsgs.map(m => m.id));
  const updated = current.map(m => {
    if (userMsgIds.has(m.id)) {
      const readBy = m.readByEmails || [];
      const updatedReadBy = cleanEmail && !readBy.map(e => e.trim().toLowerCase()).includes(cleanEmail)
        ? [...readBy, cleanEmail]
        : readBy;
      return {
        ...m,
        read: true,
        readByEmails: updatedReadBy,
        readAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      };
    }
    return m;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('admin-messages-updated'));
};

export const isMessageReadByUser = (msg: AdminMessage, userEmail?: string): boolean => {
  const readSet = getLocalReadMessageIds();
  if (readSet.has(msg.id)) return true;
  if (msg.read) return true;
  if (userEmail) {
    const cleanEmail = userEmail.trim().toLowerCase();
    if (msg.readByEmails?.some(e => e.trim().toLowerCase() === cleanEmail)) return true;
  }
  return false;
};
