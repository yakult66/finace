import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import type { SalaryAllocation } from '@shared/types'
import { useSalaryStore, useFixedExpensesStore, useEmergencyFundStore, usePocketMoneyStore } from '@/stores'
import { mergeFixedSnapshot } from '@/stores/fixedExpenses'
import { netAmountOf } from '@/stores/salary'
import { monthKey, todayString } from '@/composables/useFormat'

/** 表單草稿：尚未儲存前沒有 id */
export type SalaryDraft = Omit<SalaryAllocation, 'id'> & { id?: string }

/** 可填寫的金額欄位 */
export type SalaryMoneyField = 'income' | 'investment' | 'consumerFund' | 'allowance'

type SalaryErrorField = SalaryMoneyField | 'month' | 'payday'

const NON_NEGATIVE = /^\d+(\.\d+)?$/

export function useSalaryAllocationForm() {
  const salary = useSalaryStore()
  const fixed = useFixedExpensesStore()
  const emergency = useEmergencyFundStore()
  const pocket = usePocketMoneyStore()
  const toast = useToast()
  const { records } = storeToRefs(salary)
  const { fixedExpenses } = storeToRefs(fixed)
  const { activeMonthlyDepositTotal } = storeToRefs(emergency)

  const isLoading = ref(false)
  const isSaved = ref(false)
  const errors = ref<Partial<Record<SalaryErrorField, string>>>({})

  // 當月設定草稿
  const draft = ref<SalaryDraft>({
    month: new Date().getMonth() + 1,
    payday: todayString(),
    income: 0,
    investment: 0,
    consumerFund: 0,
    allowance: 0,
    fixedExpenses: 0,
    emergencyFund: 0,
    previousBalance: 0,
    fixedExpensesSnapshot: []
  })

  const draftYear = computed(() => Number(String(draft.value.payday ?? '').slice(0, 4)))

  // 推算「上月結餘 = 上月剩餘未花完零用金 + 上月淨額」
  const calculatePreviousBalance = (year: number, month: number): number => {
    let prevYear = year
    let prevMonth = month - 1
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear = year - 1
    }

    const prevRecord = salary.findByMonth(prevYear, prevMonth)
    if (!prevRecord) return 0

    const prevAllowance = Number(prevRecord.allowance || 0)
    const unspent = pocket.unspentAllowance(pocket.getMonthRecord(prevYear, prevMonth), prevAllowance)
    return unspent + netAmountOf(prevRecord)
  }

  // 跨模組連動：新月份或本月之後的紀錄，細項快照與總額跟著目前的固定支出清單更新；過去月份保留當時的快照
  const syncFixedSnapshot = () => {
    const d = draft.value
    const year = draftYear.value
    const month = Number(d.month)
    const saved = salary.findByMonth(year, month)
    if (saved && !salary.followsCurrentFixedExpenses(year, month)) return

    d.fixedExpensesSnapshot = mergeFixedSnapshot(d.fixedExpensesSnapshot ?? [], fixedExpenses.value, !!saved)
    d.fixedExpenses = d.fixedExpensesSnapshot.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  }

  watch(fixedExpenses, syncFixedSnapshot, { deep: true, immediate: true })

  // 跨模組連動：自動同步緊急備用金每月存入總額
  watch(
    activeMonthlyDepositTotal,
    total => {
      draft.value.emergencyFund = total
    },
    { immediate: true }
  )

  const netAmount = computed(() => netAmountOf(draft.value))

  const validate = () => {
    const d = draft.value
    const next: typeof errors.value = {}

    if (!/^(1[0-2]|[1-9])$/.test(String(d.month))) next.month = '請輸入正確的月份 (1-12)'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.payday))) next.payday = '發薪日格式錯誤 (年份只能為四碼)'
    if (!NON_NEGATIVE.test(String(d.income))) next.income = '薪資收入不可為負數'
    if (!NON_NEGATIVE.test(String(d.investment))) next.investment = '投資金額不可為負數'
    if (!NON_NEGATIVE.test(String(d.consumerFund))) next.consumerFund = '消費基金金額不可為負數'
    if (!NON_NEGATIVE.test(String(d.allowance))) next.allowance = '零用金不可為負數'

    errors.value = next
    return Object.keys(next).length === 0
  }

  // 依年月覆寫既有紀錄，儲存後清空填寫欄位
  const saveAllocation = async () => {
    if (!validate()) return

    isLoading.value = true
    isSaved.value = false

    try {
      const year = draftYear.value
      const month = Number(draft.value.month)
      const existing = salary.findByMonth(year, month)
      // 動用本月淨額由零用金紀錄維護，以目前紀錄為準，避免草稿的舊值覆蓋
      const record: SalaryAllocation = {
        ...draft.value,
        month,
        netDraw: Number(existing?.netDraw || 0),
        id: existing?.id ?? crypto.randomUUID()
      }
      await salary.save(record)

      const currentMonth = monthKey(year, month)
      fixed.processMonthlyPayment(currentMonth)
      await emergency.processSalaryPayment(currentMonth)

      draft.value.income = 0
      draft.value.investment = 0
      draft.value.consumerFund = 0
      draft.value.allowance = 0

      // 重新推算下一次的上月結餘
      draft.value.previousBalance = calculatePreviousBalance(year, month)

      // 等草稿監聽器跑完再標記已儲存，避免被立刻重設
      await nextTick()
      isSaved.value = true
      setTimeout(() => {
        isSaved.value = false
      }, 3000)
    } catch (e) {
      console.error('儲存失敗:', e)
      toast.add({ severity: 'error', summary: '儲存失敗', detail: '請稍後再試', life: 3000 })
    } finally {
      isLoading.value = false
    }
  }

  // 載入該年月的紀錄，沒有則以目前固定支出建立新草稿
  const loadDraftForCurrentMonth = () => {
    const year = draftYear.value
    const month = Number(draft.value.month)
    const calculatedPrevBalance = calculatePreviousBalance(year, month)
    const record = salary.findByMonth(year, month)

    if (record) {
      draft.value = {
        ...record,
        allowance: record.allowance || 0,
        previousBalance: calculatedPrevBalance || record.previousBalance || 0,
        fixedExpensesSnapshot: record.fixedExpensesSnapshot ? record.fixedExpensesSnapshot.map(i => ({ ...i })) : []
      }
    } else {
      draft.value = {
        month: draft.value.month,
        payday: draft.value.payday,
        income: 0,
        investment: 0,
        consumerFund: 0,
        allowance: 0,
        fixedExpenses: 0,
        emergencyFund: draft.value.emergencyFund,
        previousBalance: calculatedPrevBalance,
        fixedExpensesSnapshot: []
      }
    }
    syncFixedSnapshot()
    isSaved.value = false
  }

  // 切換年份或月份時自動讀取並推算上月結餘
  watch([() => draft.value.month, draftYear], () => loadDraftForCurrentMonth())

  // 歷史紀錄變動時更新上月結餘推算；雲端資料晚於畫面載入時，若表單仍未填寫則帶入當月紀錄
  watch(
    records,
    () => {
      const d = draft.value
      const saved = salary.findByMonth(draftYear.value, Number(d.month))
      const untouched = !d.id && !d.income && !d.investment && !d.consumerFund && !d.allowance
      if (untouched && saved) {
        loadDraftForCurrentMonth()
        return
      }
      d.previousBalance = calculatePreviousBalance(draftYear.value, Number(d.month))
      d.netDraw = Number(saved?.netDraw || 0)
    },
    { deep: true }
  )

  watch(
    draft,
    () => {
      isSaved.value = false
    },
    { deep: true }
  )

  onMounted(loadDraftForCurrentMonth)

  return {
    draft,
    activeMonthlyDepositTotal,
    isLoading,
    isSaved,
    errors,
    netAmount,
    saveAllocation,
    loadDraftForCurrentMonth,
    calculatePreviousBalance
  }
}
