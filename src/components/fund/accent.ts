/** 基金頁面的主題色（投資: indigo、娛樂基金: purple），class 需寫成完整字串讓 Tailwind 掃描得到 */
export type FundAccent = 'indigo' | 'purple'

export const ACCENT_ICON_CLASS: Record<FundAccent, string> = {
  indigo: 'text-indigo-500',
  purple: 'text-purple-500'
}

export const ACCENT_BUTTON_CLASS: Record<FundAccent, string> = {
  indigo: '',
  purple: 'bg-purple-600 border-purple-600 hover:bg-purple-700 hover:border-purple-700'
}
