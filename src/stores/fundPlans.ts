import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { FundPlan, FundTransaction } from '@shared/types'
import { useSyncedDocument } from '@/services/sync'
import { useSalaryStore } from './salary'

/**
 * 投資規劃與娛樂基金邏輯相同：
 * 目前總額 = 薪資配置累積金額 + 臨時增額 - 臨時支出
 */
function defineFundPlanStore(options: {
  name: string
  cacheKey: string
  endpoint: string
  defaultId: string
  salaryField: 'investment' | 'consumerFund'
}) {
  return defineStore(options.name, () => {
    const salary = useSalaryStore()
    const { doc: plan, load, save } = useSyncedDocument<FundPlan>(options.cacheKey, options.endpoint, {
      id: options.defaultId,
      targetAmount: 0,
      transactions: []
    })

    const sumBy = (type: FundTransaction['type']) =>
      plan.value.transactions.filter(t => t.type === type).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const accumulatedFromSalary = computed(() =>
      options.salaryField === 'investment' ? salary.totalInvestment : salary.totalConsumerFund
    )
    const totalDeposits = computed(() => sumBy('deposit'))
    const totalExpenses = computed(() => sumBy('expense'))
    const netAdjustments = computed(() => totalDeposits.value - totalExpenses.value)
    const currentBalance = computed(() => accumulatedFromSalary.value + netAdjustments.value)
    const targetAmount = computed(() => Number(plan.value.targetAmount || 0))
    const progressPercentage = computed(() =>
      targetAmount.value <= 0 ? 0 : Number(((currentBalance.value / targetAmount.value) * 100).toFixed(1))
    )
    /** 依建立時間新到舊排序 */
    const sortedTransactions = computed(() =>
      [...plan.value.transactions].sort((a, b) => b.createdAt - a.createdAt)
    )

    function setTargetAmount(amount: number) {
      plan.value.targetAmount = Number(amount || 0)
      return save()
    }

    function addTransaction(tx: Omit<FundTransaction, 'id' | 'createdAt'>) {
      plan.value.transactions.unshift({ ...tx, id: crypto.randomUUID(), createdAt: Date.now() })
      return save()
    }

    function deleteTransaction(id: string) {
      plan.value.transactions = plan.value.transactions.filter(t => t.id !== id)
      return save()
    }

    return {
      plan,
      load,
      accumulatedFromSalary,
      totalDeposits,
      totalExpenses,
      netAdjustments,
      currentBalance,
      targetAmount,
      progressPercentage,
      sortedTransactions,
      setTargetAmount,
      addTransaction,
      deleteTransaction
    }
  })
}

export const useInvestmentStore = defineFundPlanStore({
  name: 'investment',
  cacheKey: 'finance_investment_plan',
  endpoint: '/api/investment-plan',
  defaultId: 'default_investment_plan',
  salaryField: 'investment'
})

export const useEntertainmentStore = defineFundPlanStore({
  name: 'entertainment',
  cacheKey: 'finance_entertainment_fund',
  endpoint: '/api/entertainment-fund',
  defaultId: 'default_entertainment_fund',
  salaryField: 'consumerFund'
})
