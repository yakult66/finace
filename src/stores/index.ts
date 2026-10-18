import { watch } from 'vue'
import { useSalaryStore } from './salary'
import { useFixedExpensesStore } from './fixedExpenses'
import { useEmergencyFundStore } from './emergencyFund'
import { usePocketMoneyStore } from './pocketMoney'
import { useEntertainmentStore, useInvestmentStore } from './fundPlans'

export { useSalaryStore, useFixedExpensesStore, useEmergencyFundStore, usePocketMoneyStore, useInvestmentStore, useEntertainmentStore }

// 載入期間各 store 資料尚未一致，暫停固定支出快照同步
let loading = false
let snapshotWatcherStarted = false

/** 跨模組連動：固定支出清單變動時，同步本月及之後的薪資紀錄細項快照 */
function startFixedSnapshotSync() {
  const salary = useSalaryStore()
  const fixed = useFixedExpensesStore()
  if (!snapshotWatcherStarted) {
    snapshotWatcherStarted = true
    watch(
      () => fixed.fixedExpenses,
      live => {
        if (!loading) salary.refreshFixedSnapshots(live).catch(e => console.error('固定支出快照同步失敗:', e))
      },
      { deep: true }
    )
  }
  return salary.refreshFixedSnapshots(fixed.fixedExpenses)
}

/** App 啟動（以及輸入 API 金鑰後）從雲端同步所有資料 */
export async function loadAllStores() {
  loading = true
  try {
    await Promise.all([
      useSalaryStore().load(),
      useFixedExpensesStore().load(),
      useEmergencyFundStore().load(),
      usePocketMoneyStore().load(),
      useInvestmentStore().load(),
      useEntertainmentStore().load()
    ])
  } finally {
    loading = false
  }
  await startFixedSnapshotSync()
}
