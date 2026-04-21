import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const SUPA_URL = 'https://llwdfeawdtqzqtxpjigy.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsd2RmZWF3ZHRxenF0eHBqaWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTc1MjgsImV4cCI6MjA5MjI5MzUyOH0.3EmFSLejNYtw2lnWfIIO9ktElfAiWP4mreq'
const HDRS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }

async function dbGet(key) {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`, { headers: HDRS })
    const rows = await r.json()
    if (!Array.isArray(rows) || !rows.length) throw new Error('not found')
    return rows[0].value
  } catch { throw new Error('not found') }
}
async function dbSet(key, value) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/kv_store`, {
      method: 'POST',
      headers: { ...HDRS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    })
  } catch(e) { console.warn('dbSet failed', e) }
  localStorage.setItem('pb_cache_' + key, value)
}

window.storage = {
  async get(key, shared) {
    if (!shared) {
      const v = localStorage.getItem('pb_' + key)
      if (v == null) throw new Error('not found')
      return { key, value: v }
    }
    try { return { key, value: await dbGet(key), shared: true } }
    catch {
      const v = localStorage.getItem('pb_cache_' + key)
      if (v == null) throw new Error('not found')
      return { key, value: v, shared: true }
    }
  },
  async set(key, value, shared) {
    if (!shared) { localStorage.setItem('pb_' + key, value); return { key, value } }
    await dbSet(key, value)
    return { key, value, shared: true }
  },
  async delete(key, shared) {
    localStorage.removeItem((shared ? 'pb_cache_' : 'pb_') + key)
    return { key, deleted: true }
  },
  async list(prefix, shared) {
    const pfx = (shared ? 'pb_cache_' : 'pb_') + (prefix || '')
    return { keys: Object.keys(localStorage).filter(k => k.startsWith(pfx)).map(k => k.replace(shared ? 'pb_cache_' : 'pb_', '')) }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
