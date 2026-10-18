import type { RouteLocationRaw } from 'vue-router'

export interface NavItem {
  label: string
  icon: string
  to: RouteLocationRaw
  /** 判斷是否為目前頁面用的路徑前綴 */
  match: string
}

/** 側邊欄主選單 */
export const mainNav: NavItem[] = [
  { label: '當月薪資配置', icon: 'pi pi-wallet', to: { name: 'salary-allocation' }, match: '/salary' },
  { label: '資產配置', icon: 'pi pi-chart-pie', to: { name: 'investment' }, match: '/assets' },
  { label: '零用金', icon: 'pi pi-sparkles', to: { name: 'pocket-money' }, match: '/pocket-money' },
  { label: '預計費用', icon: 'pi pi-calendar-clock', to: { name: 'planned' }, match: '/planned' }
]

export interface TabItem {
  label: string
  icon: string
  /** route name */
  name: string
}
