import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://llwdfeawdtqzqtxpjigy.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsd2RmZWF3ZHRxenF0eHBqaWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTc1MjgsImV4cCI6MjA5MjI5MzUyOH0.3EmFSLejNYtw2lnWfIIO9ktElfAiWP4mreqcc3_VFyM'

const sb = createClient(SUPA_URL, SUPA_KEY)

// Cache key prefix
const C = 'pb_cache_'
const L = 'pb_'

window.storage = {
  // GET: Supabase first, fallback to localStorage cache
  async get(key, shared) {
    if (!shared) {
      const v = localStorage.getItem(L + key)
      if (v == null) throw new Error('not found')
      return { key, value: v }
    }
    try {
      // Use limit(1) instead of single() to avoid 406 when no rows
      const { data, error } = await sb
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .limit(1)
      
      if (error) throw error
      if (!data || data.length === 0) throw new Error('not found')
      
      // Update local cache
      localStorage.setItem(C + key, data[0].value)
      return { key, value: data[0].value, shared: true }
    } catch(e) {
      // Fallback to local cache
      const v = localStorage.getItem(C + key)
      if (v == null) throw new Error('not found')
      return { key, value: v, shared: true }
    }
  },

  // SET: Write to Supabase + local cache simultaneously
  async set(key, value, shared) {
    if (!shared) {
      localStorage.setItem(L + key, value)
      return { key, value }
    }
    // Always update local cache immediately
    localStorage.setItem(C + key, value)
    
    try {
      const { error } = await sb
        .from('kv_store')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      if (error) throw error
    } catch(e) {
      console.warn('[Storage] Supabase write failed, using cache only:', e.message)
    }
    return { key, value, shared: true }
  },

  async delete(key, shared) {
    localStorage.removeItem((shared ? C : L) + key)
    if (shared) {
      await sb.from('kv_store').delete().eq('key', key).catch(() => {})
    }
    return { key, deleted: true }
  },

  async list(prefix, shared) {
    const pfx = (shared ? C : L) + (prefix || '')
    return {
      keys: Object.keys(localStorage)
        .filter(k => k.startsWith(pfx))
        .map(k => k.replace(shared ? C : L, ''))
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
