import { useSalaryStore } from './salary'
import { useFixedExpensesStore } from './fixedExpenses'
import { useEmergencyFundStore } from './emergencyFund'
import { usePocketMoneyStore } from './pocketMoney'
import { useEntertainmentStore, useInvestmentStore } from './fundPlans'

export { useSalaryStore, useFixedExpensesStore, useEmergencyFundStore, usePocketMoneyStore, useInvestmentStore, useEntertainmentStore }

/** App 啟動（以及輸入 API 金鑰後）從雲端同步所有資料 */
export function loadAllStores() {
  return Promise.all([
    useSalaryStore().load(),
    useFixedExpensesStore().load(),
    useEmergencyFundStore().load(),
    usePocketMoneyStore().load(),
    useInvestmentStore().load(),
    useEntertainmentStore().load()
  ])
}
