import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { EmergencyGoal, FundTransaction } from '@shared/types'
import { useSyncedCollection } from '@/services/sync'
import { todayString } from '@/composables/useFormat'

/** 發薪日自動存入的交易名稱，也用來判斷該月是否已存過 */
export const SALARY_DEPOSIT_NAME = '每月定期存入 (發薪日)'

const sumBy = (transactions: FundTransaction[], type: FundTransaction['type']) =>
  transactions.filter(t => t.type === type).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

export const useEmergencyFundStore = defineStore('emergencyFund', () => {
  const { items: goals, load: loadGoals, save, remove } = useSyncedCollection<EmergencyGoal>(
    'finance_emergency_funds',
    '/api/emergency-goals'
  )

  const totalCurrentEmergencyFund = computed(() =>
    goals.value.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0)
  )
  const totalTargetEmergencyFund = computed(() =>
    goals.value.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0)
  )
  const overallProgress = computed(() =>
    totalTargetEmergencyFund.value <= 0
      ? 0
      : Math.min(100, Math.round((totalCurrentEmergencyFund.value / totalTargetEmergencyFund.value) * 100))
  )
  const activeMonthlyDepositTotal = computed(() =>
    goals.value.reduce((sum, g) => {
      const active = g.depositPlans.find(p => p.isActive)
      return sum + (active ? Number(active.amount) || 0 : 0)
    }, 0)
  )

  const findGoal = (id: string) => goals.value.find(g => g.id === id)

  const touch = (goal: EmergencyGoal) => {
    goal.updatedAt = Date.now()
    return save(goal)
  }

  /** 達標時自動停用該目標的所有每月存入 */
  function checkGoalCompletion(goal: EmergencyGoal) {
    if (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount) {
      goal.depositPlans.forEach(p => (p.isActive = false))
    }
  }

  /** 清除重複的發薪日存入紀錄（舊版 bug 造成），並依交易重算金額 */
  async function deduplicateSalaryDeposits() {
    for (const goal of goals.value) {
      const seenMonths = new Set<string>()
      const cleaned = goal.transactions.filter(tx => {
        if (tx.type !== 'deposit' || tx.name !== SALARY_DEPOSIT_NAME) return true
        const month = tx.date.slice(0, 7)
        if (seenMonths.has(month)) return false
        seenMonths.add(month)
        return true
      })
      if (cleaned.length === goal.transactions.length) continue

      goal.transactions = cleaned
      goal.currentAmount = Math.max(0, sumBy(cleaned, 'deposit') - sumBy(cleaned, 'expense'))
      await touch(goal)
    }
  }

  async function load() {
    await loadGoals()
    await deduplicateSalaryDeposits()
  }

  // === 目標 ===

  function addGoal(name: string, targetAmount = 0) {
    return save({
      id: crypto.randomUUID(),
      name,
      targetAmount,
      currentAmount: 0,
      depositPlans: [],
      transactions: []
    })
  }

  function updateGoal(id: string, updates: Partial<Pick<EmergencyGoal, 'name' | 'targetAmount'>>) {
    const goal = findGoal(id)
    if (!goal) return
    Object.assign(goal, updates)
    checkGoalCompletion(goal)
    return touch(goal)
  }

  const deleteGoal = (id: string) => remove(id)

  // === 每月存入設定 ===

  function addDepositPlan(goalId: string, amount: number) {
    const goal = findGoal(goalId)
    if (!goal) return
    goal.depositPlans.push({ id: crypto.randomUUID(), amount, isActive: false, isLocked: false, createdAt: Date.now() })
    return touch(goal)
  }

  /** 修改尚未鎖定的存入金額 */
  function updateDepositPlan(goalId: string, planId: string, amount: number) {
    const goal = findGoal(goalId)
    const plan = goal?.depositPlans.find(p => p.id === planId)
    if (!goal || !plan || plan.isLocked || plan.amount === amount) return
    plan.amount = amount
    return touch(goal)
  }

  function saveAndLockDepositPlan(goalId: string, planId: string) {
    const goal = findGoal(goalId)
    const plan = goal?.depositPlans.find(p => p.id === planId)
    if (!goal || !plan) return
    plan.isLocked = true
    return touch(goal)
  }

  /** 同一目標只能有一個啟用中的存入設定 */
  function toggleDepositPlanActive(goalId: string, planId: string, isActive: boolean) {
    const goal = findGoal(goalId)
    if (!goal) return
    goal.depositPlans.forEach(p => {
      if (p.id === planId) p.isActive = isActive
      else if (isActive) p.isActive = false
    })
    return touch(goal)
  }

  function deleteDepositPlan(goalId: string, planId: string) {
    const goal = findGoal(goalId)
    if (!goal) return
    goal.depositPlans = goal.depositPlans.filter(p => p.id !== planId)
    return touch(goal)
  }

  // === 臨時異動 ===

  function addTransaction(goalId: string, tx: Omit<FundTransaction, 'id' | 'createdAt'>) {
    const goal = findGoal(goalId)
    if (!goal) return
    goal.transactions.push({ ...tx, id: crypto.randomUUID(), createdAt: Date.now() })
    goal.currentAmount =
      tx.type === 'deposit' ? goal.currentAmount + tx.amount : Math.max(0, goal.currentAmount - tx.amount)
    checkGoalCompletion(goal)
    return touch(goal)
  }

  /** 發薪日結算：每個目標依啟用中的存入設定存入一次（以標記與交易紀錄雙重防重複） */
  async function processSalaryPayment(currentMonth: string) {
    for (const goal of goals.value) {
      if (goal.lastProcessedMonth === currentMonth) continue

      const alreadyDeposited = goal.transactions.some(
        tx => tx.type === 'deposit' && tx.name === SALARY_DEPOSIT_NAME && tx.date.startsWith(currentMonth)
      )
      if (alreadyDeposited) {
        goal.lastProcessedMonth = currentMonth
        await touch(goal)
        continue
      }

      const active = goal.depositPlans.find(p => p.isActive)
      if (!active || active.amount <= 0) continue

      goal.currentAmount += active.amount
      goal.transactions.push({
        id: crypto.randomUUID(),
        type: 'deposit',
        name: SALARY_DEPOSIT_NAME,
        amount: active.amount,
        date: todayString(),
        createdAt: Date.now()
      })
      goal.lastProcessedMonth = currentMonth
      checkGoalCompletion(goal)
      await touch(goal)
    }
  }

  return {
    goals,
    totalCurrentEmergencyFund,
    totalTargetEmergencyFund,
    overallProgress,
    activeMonthlyDepositTotal,
    load,
    addGoal,
    updateGoal,
    deleteGoal,
    addDepositPlan,
    updateDepositPlan,
    saveAndLockDepositPlan,
    toggleDepositPlanActive,
    deleteDepositPlan,
    addTransaction,
    processSalaryPayment
  }
})
