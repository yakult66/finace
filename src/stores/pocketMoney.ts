import { computed } from 'vue'
import { defineStore } from 'pinia'
import { POCKET_CATEGORIES } from '@shared/types'
import type { PocketMoneyMonthRecord, PocketMoneyTransaction } from '@shared/types'
import { useSyncedCollection } from '@/services/sync'
import { useSalaryStore } from './salary'

const sumBy = (transactions: PocketMoneyTransaction[], type: PocketMoneyTransaction['type']) =>
  transactions.filter(t => t.type === type).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

export const usePocketMoneyStore = defineStore('pocketMoney', () => {
  const salary = useSalaryStore()
  const { items: records, load, save } = useSyncedCollection<PocketMoneyMonthRecord>(
    'finance_pocket_money',
    '/api/pocket-money'
  )

  /** 依年月新到舊排序 */
  const sortedRecords = computed(() =>
    [...records.value].sort((a, b) => b.year - a.year || b.month - a.month)
  )

  const findRecord = (year: number, month: number) =>
    records.value.find(r => r.year === year && r.month === month)

  /** 該月薪資配置的零用金（沒有薪資紀錄時為 0） */
  const salaryAllowanceFor = (year: number, month: number) =>
    Number(salary.findByMonth(year, month)?.allowance || 0)

  /** 取得當月紀錄；尚未有任何收支時回傳一筆未儲存的空紀錄，不會寫入資料 */
  function getMonthRecord(year: number, month: number): PocketMoneyMonthRecord {
    return (
      findRecord(year, month) ?? {
        id: '',
        year,
        month,
        allocatedAllowance: salaryAllowanceFor(year, month),
        transactions: []
      }
    )
  }

  /** 該月可用零用金：優先採用薪資配置的最新金額 */
  function allocatedFor(record: PocketMoneyMonthRecord, fallback = 0) {
    const fromSalary = salaryAllowanceFor(record.year, record.month)
    return fromSalary > 0 ? fromSalary : Number(record.allocatedAllowance || fallback)
  }

  /** 剩餘未花完零用金 = 可用零用金 + 額外收入 - 支出 */
  function unspentAllowance(record: PocketMoneyMonthRecord, fallbackAllocated = 0) {
    return allocatedFor(record, fallbackAllocated) + sumBy(record.transactions, 'income') - sumBy(record.transactions, 'expense')
  }

  function categoryStatistics(transactions: PocketMoneyTransaction[]) {
    const expenses = transactions.filter(t => t.type === 'expense')
    const totalExpense = sumBy(expenses, 'expense')
    const stats = POCKET_CATEGORIES.map(category => {
      const amount = expenses.filter(t => t.category === category).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      const percentage = totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0
      return { category, amount, percentage }
    })
    return { totalExpense, totalIncome: sumBy(transactions, 'income'), stats }
  }

  function addTransaction(year: number, month: number, tx: Omit<PocketMoneyTransaction, 'id' | 'createdAt'>) {
    const record = findRecord(year, month) ?? {
      id: crypto.randomUUID(),
      year,
      month,
      allocatedAllowance: salaryAllowanceFor(year, month),
      transactions: []
    }
    record.transactions.unshift({ ...tx, id: crypto.randomUUID(), createdAt: Date.now() })
    record.allocatedAllowance = allocatedFor(record)
    record.updatedAt = Date.now()
    return save(record)
  }

  function deleteTransaction(year: number, month: number, txId: string) {
    const record = findRecord(year, month)
    if (!record) return
    record.transactions = record.transactions.filter(t => t.id !== txId)
    record.updatedAt = Date.now()
    return save(record)
  }

  return {
    records,
    sortedRecords,
    load,
    getMonthRecord,
    allocatedFor,
    unspentAllowance,
    categoryStatistics,
    addTransaction,
    deleteTransaction
  }
})
