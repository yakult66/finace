/**
 * 「本機快取 + 雲端同步」的共用邏輯，給 Pinia store 使用。
 * 讀取：先顯示快取，再以雲端資料覆蓋；寫入：先寫快取，再送到 API。
 */
import { ref, type Ref } from 'vue'
import { http } from './http'
import { readCache, writeCache } from './cache'

/** 多筆文件的資源，對應後端 collectionRouter */
export function useSyncedCollection<T extends { id: string }>(
  cacheKey: string,
  endpoint: string,
  normalize: (items: T[]) => T[] = items => items
) {
  const items = ref(normalize(readCache<T[]>(cacheKey, []))) as Ref<T[]>
  const persistLocal = () => writeCache(cacheKey, items.value)

  async function load() {
    const remote = await http.get<T[]>(endpoint)
    if (remote) {
      items.value = normalize(remote)
      persistLocal()
    }
  }

  async function save(item: T) {
    const index = items.value.findIndex(i => i.id === item.id)
    if (index === -1) items.value.push(item)
    else items.value[index] = item
    persistLocal()
    await http.put(`${endpoint}/${encodeURIComponent(item.id)}`, item)
  }

  async function remove(id: string) {
    items.value = items.value.filter(i => i.id !== id)
    persistLocal()
    await http.delete(`${endpoint}/${encodeURIComponent(id)}`)
  }

  return { items, load, save, remove }
}

/** 只有一份文件的資源，對應後端 singletonRouter */
export function useSyncedDocument<T extends object>(cacheKey: string, endpoint: string, defaults: T) {
  const doc = ref({ ...defaults, ...readCache<Partial<T>>(cacheKey, {}) }) as Ref<T>
  const persistLocal = () => writeCache(cacheKey, doc.value)

  async function load() {
    const remote = await http.get<T>(endpoint)
    if (remote) {
      doc.value = { ...defaults, ...remote }
      persistLocal()
    }
  }

  async function save() {
    persistLocal()
    await http.put(endpoint, doc.value)
  }

  return { doc, load, save }
}
