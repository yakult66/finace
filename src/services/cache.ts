/**
 * localStorage 快取。無痕模式或儲存空間不足時 localStorage 可能丟出例外，
 * 這裡一律吞掉，讓 App 仍可運作（只是失去離線資料）。
 */
export function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[Cache] 無法寫入 ${key}:`, err)
  }
}
