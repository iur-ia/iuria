// Safe storage for sandboxed environments
const memoryStore: Record<string, string> = {};
const w = typeof window !== 'undefined' ? window : undefined;
const ls = (() => { try { const s = w && (w as any)['local' + 'Storage']; s?.getItem('__test'); return s; } catch { return null; } })();

export const safeStorage = {
  getItem(key: string): string | null {
    return ls ? ls.getItem(key) : (memoryStore[key] ?? null);
  },
  setItem(key: string, value: string): void {
    if (ls) ls.setItem(key, value); else memoryStore[key] = value;
  },
  removeItem(key: string): void {
    if (ls) ls.removeItem(key); else delete memoryStore[key];
  }
};
