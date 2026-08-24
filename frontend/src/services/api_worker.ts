const API_HOST = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '127.0.0.1' : (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');
export const API_BASE_URL = `http://${API_HOST}:8000`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export interface WorkerSummaryData {
  worker_id: number;
  worker_name: string;
  role: string;
  specialization: string;
  is_driver: boolean;
  active_tasks_count: number;
  pending_tasks_count: number;
  completed_today_count: number;
  onsite_jobs_count: number;
}

export interface WorkerTaskItem {
  task_id: string;
  raw_assignment_id?: number;
  raw_stage_id?: number;
  order_type: string;
  order_id: string;
  raw_order_id: number;
  job_name: string;
  stage_name: string;
  required_skill: string;
  task_status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | string;
  assigned_date: string;
  dimensions: string;
  material: string;
  color: string;
  customer_requirements: string;
  reference_image?: string;
  technical_instructions?: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage: number;
}

export interface WorkerCompletedHistoryItem {
  task_id: string;
  order_id: string;
  job_name: string;
  stage_name: string;
  completed_date: string;
  duration: string;
  status: string;
  technical_instructions?: string;
}

export interface WorkerOnsiteJobItem {
  job_id: number;
  service_id: string;
  service_category: string;
  description: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  scheduled_time: string;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'IN_PROGRESS' | 'COMPLETED' | string;
  before_photos?: string;
  after_photos?: string;
  customer_notes?: string;
  completed_at?: string;
}

export async function fetchWorkerSummaryDB(): Promise<WorkerSummaryData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/my-summary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker summary from DB:', err);
    return null;
  }
}

export async function fetchWorkerTasksDB(statusFilter?: string): Promise<WorkerTaskItem[]> {
  try {
    const url = statusFilter && statusFilter !== 'All'
      ? `${API_BASE_URL}/api/worker/my-tasks?status_filter=${encodeURIComponent(statusFilter)}`
      : `${API_BASE_URL}/api/worker/my-tasks`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker tasks from DB:', err);
    return [];
  }
}

export async function fetchWorkerTaskDetailsDB(taskId: string): Promise<WorkerTaskItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Error fetching task details for '${taskId}':`, err);
    return null;
  }
}

export async function startWorkerTaskDB(taskId: string): Promise<{ message: string; task_status: string; started_at: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/start`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start task' }));
    throw new Error(err.detail || 'Failed to start task');
  }
  return await res.json();
}

export async function completeWorkerTaskDB(
  taskId: string,
  payload: { notes?: string; work_images?: string; progress_percentage?: number }
): Promise<{ message: string; task_status: string; completed_at: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to complete task' }));
    throw new Error(err.detail || 'Failed to complete task');
  }
  return await res.json();
}

export async function reportWorkerTaskIssueDB(
  taskId: string,
  payload: { issue_type: string; description: string; photo_url?: string }
): Promise<{ message: string; task_status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/report-issue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to report task issue' }));
    throw new Error(err.detail || 'Failed to report task issue');
  }
  return await res.json();
}

export async function fetchWorkerCompletedHistoryDB(): Promise<WorkerCompletedHistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/completed-history`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker completed history:', err);
    return [];
  }
}

export async function fetchWorkerOnsiteJobsDB(): Promise<WorkerOnsiteJobItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/onsite-jobs`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker on-site service jobs:', err);
    return [];
  }
}

export async function updateWorkerOnsiteJobStatusDB(
  jobId: number,
  payload: { status: string; customer_notes?: string; before_photos?: string; after_photos?: string }
): Promise<{ message: string; status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/onsite-jobs/${jobId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update on-site job status' }));
    throw new Error(err.detail || 'Failed to update on-site job status');
  }
  return await res.json();
}
