import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { FixedExpense, SalaryAllocation } from '@shared/types'
import { useSyncedCollection } from '@/services/sync'
import { mergeFixedSnapshot } from './fixedExpenses'

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

  /** 本月或之後的月份才跟著目前的固定支出清單變動，過去月份保留當時的快照 */
  const followsCurrentFixedExpenses = (year: number, month: number) => {
    const now = new Date()
    return year * 12 + month >= now.getFullYear() * 12 + now.getMonth() + 1
  }

  /** 固定支出清單變動時，同步更新本月及之後紀錄的細項快照與總額 */
  async function refreshFixedSnapshots(live: FixedExpense[]) {
    const updates: SalaryAllocation[] = []
    for (const record of records.value) {
      if (!followsCurrentFixedExpenses(yearOf(record), Number(record.month))) continue
      const old = record.fixedExpensesSnapshot ?? []
      const snapshot = mergeFixedSnapshot(old, live, true)
      const fixedExpenses = snapshot.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
      const unchanged =
        Number(record.fixedExpenses) === fixedExpenses &&
        snapshot.length === old.length &&
        snapshot.every(
          (item, i) =>
            item.id === old[i].id &&
            item.sourceId === old[i].sourceId &&
            item.name === old[i].name &&
            Number(item.amount) === Number(old[i].amount) &&
            !!item.locked === !!old[i].locked &&
            (item.linkedLargeExpenseId ?? null) === (old[i].linkedLargeExpenseId ?? null)
        )
      if (!unchanged) updates.push({ ...record, fixedExpensesSnapshot: snapshot, fixedExpenses })
    }
    await Promise.all(updates.map(save))
  }

  return {
    records,
    sortedRecords,
    load,
    save,
    remove,
    yearOf,
    findByMonth,
    totalInvestment,
    totalConsumerFund,
    followsCurrentFixedExpenses,
    refreshFixedSnapshots
  }
})
