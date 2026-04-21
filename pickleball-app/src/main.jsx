import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { createClient } from '@supabase/supabase-js'

// Supabase config
const SUPA_URL = 'https://llwdfeawdtqzqtxpjigy.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsd2RmZWF3ZHRxenF0eHBqaWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTc1MjgsImV4cCI6MjA5MjI5MzUyOH0.3EmFSLejNYtw2lnWfIIO9ktElfAiWP4mreqcc3_VFyM'

const supabase = createClient(SUPA_URL, SUPA_KEY)

// Storage adapter using Supabase JS SDK (handles auth, allowlist, etc properly)
window.storage = {
  async get(key, shared) {
    if (!shared) {
      const v = localStorage.getItem('pb_' + key)
      if (v == null) throw new Error('not found')
      return { key, value: v }
    }
    try {
      const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single()
      if (error || !data) throw new Error('not found')
      // Update local cache
      localStorage.setItem('pb_cache_' + key, data.value)
      return { key, value: data.value, shared: true }
    } catch {
      // Fallback to local cache
      const v = localStorage.getItem('pb_cache_' + key)
      if (v == null) throw new Error('not found')
      return { key, value: v, shared: true }
    }
  },

  async set(key, value, shared) {
    if (!shared) {
      localStorage.setItem('pb_' + key, value)
      return { key, value }
    }
    // Save to cache immediately
    localStorage.setItem('pb_cache_' + key, value)
    // Save to Supabase
    try {
      const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) console.warn('Supabase write error:', error.message)
    } catch(e) {
      console.warn('Supabase save failed:', e)
    }
    return { key, value, shared: true }
  },

  async delete(key, shared) {
    localStorage.removeItem((shared ? 'pb_cache_' : 'pb_') + key)
    if (shared) {
      await supabase.from('kv_store').delete().eq('key', key)
    }
    return { key, deleted: true }
  },

  async list(prefix, shared) {
    const pfx = (shared ? 'pb_cache_' : 'pb_') + (prefix || '')
    return {
      keys: Object.keys(localStorage)
        .filter(k => k.startsWith(pfx))
        .map(k => k.replace(shared ? 'pb_cache_' : 'pb_', ''))
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
