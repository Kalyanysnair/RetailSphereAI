import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSessionManagement } from './utils/sessionUtils';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { setupApiClient } from './services/apiClient';

// Initialize performance query cache & request deduplication interceptor
setupApiClient();

// Automatically clear stale sessions if the browser was closed and reopened
try {
  initSessionManagement();
} catch (e) {
  console.warn('Session initialization warning:', e);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

