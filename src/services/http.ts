/**
 * 與後端 API 通訊。網路失敗時回傳 null，由呼叫端改用本機快取（離線可用）。
 * 收到 401 時標記 needsToken，讓畫面提示使用者輸入 API 金鑰。
 */
import { ref } from 'vue'
import { readCache, writeCache } from './cache'

const TOKEN_KEY = 'finance_api_token'

export const apiToken = ref<string>(readCache(TOKEN_KEY, ''))
export const needsToken = ref(false)
export const isOffline = ref(false)

export function setApiToken(token: string) {
  apiToken.value = token.trim()
  writeCache(TOKEN_KEY, apiToken.value)
  needsToken.value = false
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiToken.value) headers.Authorization = `Bearer ${apiToken.value}`

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    isOffline.value = false

    if (res.status === 401) {
      needsToken.value = true
      return null
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.status === 204 ? null : ((await res.json()) as T)
  } catch (err) {
    isOffline.value = true
    console.warn(`[API] ${method} ${path} 失敗，改用本機資料:`, err)
    return null
  }
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: (path: string) => request<null>('DELETE', path)
}
