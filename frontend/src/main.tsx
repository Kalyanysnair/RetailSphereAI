import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSessionManagement } from './utils/sessionUtils';

// Automatically clear stale sessions if the browser was closed and reopened
initSessionManagement();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

