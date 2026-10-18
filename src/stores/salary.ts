import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { SalaryAllocation } from '@shared/types'
import { useSyncedCollection } from '@/services/sync'

/** 舊版快取可能是單一物件或缺少 id，載入時統一轉成陣列並補上 id */
function normalize(items: unknown): SalaryAllocation[] {
  const list = Array.isArray(items)
    ? items
    : items && typeof items === 'object' && 'month' in items
      ? [items]
      : []
  return (list as SalaryAllocation[]).map(r => (r.id ? r : { ...r, id: crypto.randomUUID() }))
}

export const useSalaryStore = defineStore('salary', () => {
  const { items: records, load, save, remove } = useSyncedCollection<SalaryAllocation>(
    'finance_salary_allocation',
    '/api/salary-allocations',
    normalize
  )

  const yearOf = (record: SalaryAllocation) => Number(record.payday.slice(0, 4))

  const findByMonth = (year: number, month: number) =>
    records.value.find(r => yearOf(r) === year && Number(r.month) === month)

  /** 依發薪日新到舊排序 */
  const sortedRecords = computed(() => [...records.value].sort((a, b) => b.payday.localeCompare(a.payday)))

  const sumOf = (field: 'investment' | 'consumerFund') =>
    records.value.reduce((sum, r) => sum + (Number(r[field]) || 0), 0)

  const totalInvestment = computed(() => sumOf('investment'))
  const totalConsumerFund = computed(() => sumOf('consumerFund'))

  return { records, sortedRecords, load, save, remove, yearOf, findByMonth, totalInvestment, totalConsumerFund }
})
