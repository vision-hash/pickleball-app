// JSONBin.io free shared storage
// Bin ID sẽ được tạo lần đầu khi app chạy, lưu vào localStorage
// Sau đó dùng chung bin ID cho toàn bộ CLB

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
// Free API key - public read, tạo bin mới
const API_KEY = '$2a$10$PLACEHOLDER_REPLACE_WITH_REAL_KEY';

// Fallback to localStorage nếu không có network
const localFallback = {
  async get(key) {
    const val = localStorage.getItem(key);
    if (!val) throw new Error('Not found');
    return { key, value: val };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  }
};

export function createStorage() {
  return {
    async get(key, shared) {
      if (!shared) return localFallback.get(key);
      try {
        const binId = localStorage.getItem('__jsonbin_id__');
        if (!binId) throw new Error('No bin');
        const res = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, {
          headers: { 'X-Master-Key': API_KEY }
        });
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        const val = data.record?.[key];
        if (val === undefined) throw new Error('Key not found');
        return { key, value: typeof val === 'string' ? val : JSON.stringify(val), shared: true };
      } catch(e) {
        return localFallback.get('shared_' + key);
      }
    },
    async set(key, value, shared) {
      if (!shared) return localFallback.set(key, value);
      try {
        let binId = localStorage.getItem('__jsonbin_id__');
        if (!binId) {
          // Create new bin
          const res = await fetch(`${JSONBIN_BASE}/b`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Master-Key': API_KEY,
              'X-Bin-Name': 'pickleball-club',
              'X-Bin-Private': 'false'
            },
            body: JSON.stringify({ [key]: value })
          });
          const data = await res.json();
          binId = data.metadata?.id;
          if (binId) localStorage.setItem('__jsonbin_id__', binId);
        } else {
          // Read current, merge, update
          const getRes = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, {
            headers: { 'X-Master-Key': API_KEY }
          });
          const current = getRes.ok ? ((await getRes.json()).record || {}) : {};
          current[key] = value;
          await fetch(`${JSONBIN_BASE}/b/${binId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Master-Key': API_KEY
            },
            body: JSON.stringify(current)
          });
        }
        localFallback.set('shared_' + key, value);
        return { key, value, shared: true };
      } catch(e) {
        return localFallback.set('shared_' + key, value);
      }
    },
    async delete(key, shared) {
      localStorage.removeItem(shared ? 'shared_' + key : key);
      return { key, deleted: true };
    },
    async list(prefix, shared) {
      const keys = Object.keys(localStorage)
        .filter(k => shared ? k.startsWith('shared_') : !k.startsWith('shared_'))
        .map(k => shared ? k.replace('shared_', '') : k)
        .filter(k => !prefix || k.startsWith(prefix));
      return { keys };
    }
  };
}
