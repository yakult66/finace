/**
 * 前後端共用的資料型別。
 * 前端 store 與後端 Mongoose model 都以這裡的定義為準，避免兩邊欄位不同步。
 */

/** 伺服器自動維護的時間戳記（Mongoose timestamps），舊資料可能是數字 */
export interface ServerTimestamps {
  createdAt?: string | number
  updatedAt?: string | number
}

/** 基金類的臨時異動紀錄（投資規劃、娛樂基金、緊急備用金共用） */
export interface FundTransaction {
  id: string
  type: 'deposit' | 'expense'
  name: string
  amount: number
  /** YYYY-MM-DD */
  date: string
  createdAt: number
}

// === 薪資配置 ===

export interface FixedExpenseSnapshotItem {
  id?: string
  name: string
  amount: number
  linkedLargeExpenseId?: string
}

export interface SalaryAllocation extends ServerTimestamps {
  id: string
  /** 薪水月份 1-12 */
  month: number
  /** 發薪日 YYYY-MM-DD */
  payday: string
  income: number
  investment: number
  consumerFund: number
  allowance: number
  /** 固定費用總額 */
  fixedExpenses: number
  /** 緊急備用金快照 */
  emergencyFund: number
  /** 上月結餘快照 */
  previousBalance: number
  /** 當月固定支出細項快照 */
  fixedExpensesSnapshot?: FixedExpenseSnapshotItem[]
}

// === 固定支出 ===

export interface FixedExpense {
  id: string
  name: string
  amount: number
  /** 由大額支出自動均攤產生的項目會記錄來源 */
  linkedLargeExpenseId?: string
  createdAt?: number
  updatedAt?: number
}

export interface LargeExpense {
  id: string
  name: string
  totalAmount: number
  /** 已存金額 */
  accumulatedAmount: number
  /** 繳款月份 YYYY-MM */
  paymentMonth: string
  /** 是否平均分攤到每月固定支出 */
  isAveraged: boolean
  /** 最後一次發薪日自動結算的月份，防止重複結算 */
  lastProcessedMonth?: string
  createdAt?: number
  updatedAt?: number
}

export interface FixedExpensesDoc {
  monthly: FixedExpense[]
  annual: LargeExpense[]
}

// === 緊急備用金 ===

export interface EmergencyDepositPlan {
  id: string
  amount: number
  /** 同一個目標底下只能有一個啟用 */
  isActive: boolean
  /** 鎖定後金額不可編輯 */
  isLocked: boolean
  createdAt: number
}

export interface EmergencyGoal extends ServerTimestamps {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  depositPlans: EmergencyDepositPlan[]
  transactions: FundTransaction[]
  /** 最後一次發薪日結算的月份 YYYY-MM */
  lastProcessedMonth?: string
}

// === 零用金 ===

export const POCKET_CATEGORIES = ['餐費', '交通', '遠程交通', '旅遊', '娛樂', '其他'] as const
export type PocketCategory = (typeof POCKET_CATEGORIES)[number]

export interface PocketMoneyTransaction {
  id: string
  type: 'income' | 'expense'
  category: PocketCategory
  name: string
  amount: number
  /** YYYY-MM-DD */
  date: string
  createdAt: number
}

export interface PocketMoneyMonthRecord extends ServerTimestamps {
  id: string
  year: number
  month: number
  allocatedAllowance: number
  transactions: PocketMoneyTransaction[]
}

// === 投資規劃 / 娛樂基金 ===

export interface FundPlan extends ServerTimestamps {
  id: string
  targetAmount: number
  transactions: FundTransaction[]
}
