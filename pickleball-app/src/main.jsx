import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Shared storage using localStorage + BroadcastChannel for same-device sync
// For multi-device: Admin uses Export/Import feature
const store = {};

window.storage = {
  async get(key, shared) {
    try {
      const k = (shared ? 'pb_shared_' : 'pb_') + key;
      const val = localStorage.getItem(k);
      if (val === null) throw new Error('Key not found: ' + k);
      return { key, value: val, shared: !!shared };
    } catch(e) {
      throw e;
    }
  },
  async set(key, value, shared) {
    const k = (shared ? 'pb_shared_' : 'pb_') + key;
    localStorage.setItem(k, value);
    // Notify other tabs on same browser
    try {
      const bc = new BroadcastChannel('pickleball_sync');
      bc.postMessage({ key, value, shared });
      bc.close();
    } catch(e) {}
    return { key, value, shared: !!shared };
  },
  async delete(key, shared) {
    const k = (shared ? 'pb_shared_' : 'pb_') + key;
    localStorage.removeItem(k);
    return { key, deleted: true };
  },
  async list(prefix, shared) {
    const pfx = (shared ? 'pb_shared_' : 'pb_') + (prefix || '');
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(pfx))
      .map(k => k.replace(shared ? 'pb_shared_' : 'pb_', ''));
    return { keys };
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
