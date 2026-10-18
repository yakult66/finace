/** 金額與日期的顯示格式，全站統一從這裡取用 */

export function formatMoney(value: number | null | undefined): string {
  return `$${Number(value || 0).toLocaleString()}`
}

/** 帶正負號的金額，例如 +$1,000 / -$500 */
export function formatSignedMoney(value: number, sign: '+' | '-'): string {
  return `${sign}${formatMoney(value)}`
}

/** 今天的日期 YYYY-MM-DD（本地時區） */
export function todayString(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** 年月字串 YYYY-MM */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Date 物件 → YYYY-MM-DD（本地時區），給 PrimeVue DatePicker 用 */
export function toDateString(date: Date): string {
  return `${monthKey(date.getFullYear(), date.getMonth() + 1)}-${String(date.getDate()).padStart(2, '0')}`
}

/** YYYY-MM-DD → Date 物件（本地時區） */
export function fromDateString(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
