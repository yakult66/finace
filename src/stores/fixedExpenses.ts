import { computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { FixedExpense, FixedExpenseSnapshotItem, FixedExpensesDoc, LargeExpense } from '@shared/types'
import { useSyncedDocument } from '@/services/sync'
import { readCache, writeCache } from '@/services/cache'
import { monthKey } from '@/composables/useFormat'

const CACHE_KEY = 'finance_fixed_expenses_doc'

/** 舊版把每月與大額支出分成兩個 localStorage key，第一次載入時合併 */
function migrateLegacyCache() {
  if (readCache<FixedExpensesDoc | null>(CACHE_KEY, null)) return
  const monthly = readCache<FixedExpense[]>('finance_fixed_expenses', [])
  const annual = readCache<LargeExpense[]>('finance_large_expenses', [])
  if (monthly.length || annual.length) writeCache(CACHE_KEY, { monthly, annual })
}

const absoluteMonth = (year: number, month: number) => year * 12 + month
const currentAbsoluteMonth = () => {
  const now = new Date()
  return absoluteMonth(now.getFullYear(), now.getMonth() + 1)
}

/** 繳款月份前還有幾期可以存（存到繳款前一個月，至少 1 期） */
export function calculateInstallments(paymentMonth: string): number {
  if (!paymentMonth) return 1
  const [year, month] = paymentMonth.split('-').map(Number)
  const installments = absoluteMonth(year, month) - currentAbsoluteMonth() - 1
  return installments > 0 ? installments : 1
}

/** 選擇的月份已過（或為本月）就排到明年 */
function paymentMonthFor(targetMonth: number): string {
  const now = new Date()
  const year = targetMonth <= now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear()
  return monthKey(year, targetMonth)
}

/**
 * 依目前的固定支出清單更新薪資紀錄的細項快照：新增的項目補上、刪除的項目移除、名稱與金額跟著更新。
 * keepLinkedAmounts：已儲存的紀錄保留大額支出連動項目的金額（發薪日已依該金額存入，結算後均攤金額會重算）
 * 在歷史紀錄手動固定（locked）的項目一律保留金額
 */
export function mergeFixedSnapshot(
  snapshot: FixedExpenseSnapshotItem[],
  live: FixedExpense[],
  keepLinkedAmounts = false
): FixedExpenseSnapshotItem[] {
  const unmatched = [...snapshot]
  const take = (match: (s: FixedExpenseSnapshotItem) => boolean) => {
    const index = unmatched.findIndex(match)
    return index === -1 ? undefined : unmatched.splice(index, 1)[0]
  }

  return live.map(item => {
    // 舊快照沒有 sourceId，改以連動來源或名稱比對
    const existing =
      take(s => s.sourceId === item.id) ??
      take(s =>
        !s.sourceId && item.linkedLargeExpenseId
          ? s.linkedLargeExpenseId === item.linkedLargeExpenseId
          : !s.sourceId && !s.linkedLargeExpenseId && s.name === item.name
      )
    const keepAmount = existing && (existing.locked || (keepLinkedAmounts && item.linkedLargeExpenseId))
    return {
      id: existing?.id ?? crypto.randomUUID(),
      sourceId: item.id,
      name: item.name,
      amount: keepAmount ? existing.amount : item.amount,
      linkedLargeExpenseId: item.linkedLargeExpenseId,
      ...(existing?.locked && { locked: true })
    }
  })
}

function monthlyShare(exp: LargeExpense): number {
  const remaining = exp.totalAmount - exp.accumulatedAmount
  return remaining > 0 ? Math.ceil(remaining / calculateInstallments(exp.paymentMonth)) : 0
}

export const useFixedExpensesStore = defineStore('fixedExpenses', () => {
  migrateLegacyCache()
  const { doc, load: loadDoc, save } = useSyncedDocument<FixedExpensesDoc>(CACHE_KEY, '/api/fixed-expenses', {
    monthly: [],
    annual: []
  })

  const fixedExpenses = computed(() => doc.value.monthly)
  const largeExpenses = computed(() => doc.value.annual)
  const totalFixedExpenses = computed(() =>
    doc.value.monthly.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  )

  // 載入完成後，任何變動都自動同步（含元件直接編輯欄位的情況）
  let ready = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    doc,
    () => {
      if (!ready) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(save, 400)
    },
    { deep: true }
  )

  /** 大額支出同步到每月固定支出：均攤時建立／更新連動項目，取消均攤則移除 */
  function syncLargeToFixed(exp: LargeExpense) {
    const monthly = doc.value.monthly
    const index = monthly.findIndex(e => e.linkedLargeExpenseId === exp.id)

    if (!exp.isAveraged) {
      if (index !== -1) monthly.splice(index, 1)
      return
    }

    const amount = monthlyShare(exp)
    if (index !== -1) {
      Object.assign(monthly[index], { name: exp.name, amount, updatedAt: Date.now() })
    } else {
      monthly.push({
        id: crypto.randomUUID(),
        name: exp.name,
        amount,
        linkedLargeExpenseId: exp.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
  }

  /** 舊資料轉換，並把已過繳款月份的大額支出展期到明年 */
  function rolloverExpiredExpenses(): boolean {
    let changed = false
    const now = currentAbsoluteMonth()

    for (const exp of doc.value.annual) {
      const legacy = exp as LargeExpense & { paymentYear?: number; targetMonth?: number }
      if (legacy.paymentYear && legacy.targetMonth && !exp.paymentMonth) {
        exp.paymentMonth = monthKey(legacy.paymentYear, legacy.targetMonth)
        delete legacy.paymentYear
        delete legacy.targetMonth
        changed = true
      }
      if (exp.isAveraged === undefined) {
        exp.isAveraged = true
        changed = true
      }
      if (!exp.paymentMonth) continue

      const [year, month] = exp.paymentMonth.split('-').map(Number)
      if (now > absoluteMonth(year, month)) {
        exp.paymentMonth = monthKey(year + 1, month)
        exp.accumulatedAmount = 0
        exp.updatedAt = Date.now()
        changed = true
      }
    }

    if (changed) doc.value.annual.forEach(syncLargeToFixed)
    return changed
  }

  async function load() {
    await loadDoc()
    const changed = rolloverExpiredExpenses()
    ready = true
    if (changed) await save()
  }

  // === 每月固定支出 ===

  function addFixedExpense(expense: Pick<FixedExpense, 'name' | 'amount'>) {
    doc.value.monthly.push({ ...expense, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() })
  }

  function updateFixedExpense(id: string, updates: Partial<FixedExpense>) {
    const item = doc.value.monthly.find(e => e.id === id)
    if (item) Object.assign(item, updates, { updatedAt: Date.now() })
  }

  function deleteFixedExpense(id: string) {
    doc.value.monthly = doc.value.monthly.filter(e => e.id !== id)
  }

  // === 大額支出 ===

  function addLargeExpense(
    expense: Pick<LargeExpense, 'name' | 'totalAmount' | 'accumulatedAmount' | 'isAveraged'> & { targetMonth: number }
  ) {
    const { targetMonth, ...rest } = expense
    const newExpense: LargeExpense = {
      ...rest,
      id: crypto.randomUUID(),
      paymentMonth: paymentMonthFor(targetMonth),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    doc.value.annual.push(newExpense)
    syncLargeToFixed(newExpense)
  }

  function updateLargeExpense(id: string, updates: Partial<LargeExpense> & { targetMonth?: number }) {
    const exp = doc.value.annual.find(e => e.id === id)
    if (!exp) return
    const { targetMonth, ...rest } = updates
    Object.assign(exp, rest, { updatedAt: Date.now() })
    if (targetMonth) exp.paymentMonth = paymentMonthFor(targetMonth)
    syncLargeToFixed(exp)
  }

  function deleteLargeExpense(id: string) {
    doc.value.monthly = doc.value.monthly.filter(e => e.linkedLargeExpenseId !== id)
    doc.value.annual = doc.value.annual.filter(e => e.id !== id)
  }

  /** 調整大額支出的已存金額（可為負數，用於歷史紀錄修改時回沖），並重算均攤 */
  function addAccumulatedAmount(id: string, amount: number) {
    const exp = doc.value.annual.find(e => e.id === id)
    if (!exp || amount === 0) return
    exp.accumulatedAmount = Math.max(0, exp.accumulatedAmount + amount)
    exp.updatedAt = Date.now()
    syncLargeToFixed(exp)
  }

  /** 發薪日結算：把本月均攤金額存入各個均攤中的大額支出（每月只處理一次） */
  function processMonthlyPayment(currentMonth: string) {
    let changed = false
    for (const exp of doc.value.annual) {
      if (!exp.isAveraged || exp.lastProcessedMonth === currentMonth) continue
      // 連動項目被手動刪除時，仍以均攤公式計算
      const linked = doc.value.monthly.find(f => f.linkedLargeExpenseId === exp.id)
      const amount = linked ? linked.amount : monthlyShare(exp)
      if (amount > 0) {
        exp.accumulatedAmount += amount
        exp.lastProcessedMonth = currentMonth
        exp.updatedAt = Date.now()
        changed = true
      }
    }
    if (changed) doc.value.annual.forEach(syncLargeToFixed)
  }

  return {
    fixedExpenses,
    largeExpenses,
    totalFixedExpenses,
    load,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    addLargeExpense,
    updateLargeExpense,
    deleteLargeExpense,
    addAccumulatedAmount,
    processMonthlyPayment,
    calculateInstallments
  }
})
