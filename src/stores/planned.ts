import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { PlannedItem } from '@shared/types'
import { useSyncedCollection } from '@/services/sync'

export type PlannedItemInput = Pick<PlannedItem, 'type' | 'name' | 'amount' | 'date' | 'note'>

const sumBy = (items: PlannedItem[], type: PlannedItem['type']) =>
  items.filter(i => i.type === type).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

/** 預計費用紀錄：獨立功能，不與薪資、零用金等其他模組連動 */
export const usePlannedStore = defineStore('planned', () => {
  const { items, load, save, remove } = useSyncedCollection<PlannedItem>('finance_planned_items', '/api/planned-items')

  /** 依預計日期由近到遠排序，同一天依建立時間 */
  const sortedItems = computed(() =>
    [...items.value].sort(
      (a, b) => a.date.localeCompare(b.date) || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))
    )
  )

  /** 有紀錄的月份 YYYY-MM，由近到遠 */
  const months = computed(() => [...new Set(items.value.map(i => i.date.slice(0, 7)))].sort())

  function totalsOf(list: PlannedItem[]) {
    const income = sumBy(list, 'income')
    const expense = sumBy(list, 'expense')
    return { income, expense, net: income - expense }
  }

  function addItem(input: PlannedItemInput) {
    return save({ ...input, id: crypto.randomUUID() })
  }

  function updateItem(id: string, input: PlannedItemInput) {
    const item = items.value.find(i => i.id === id)
    if (!item) return
    return save({ ...item, ...input })
  }

  const deleteItem = (id: string) => remove(id)

  return { items, sortedItems, months, load, totalsOf, addItem, updateItem, deleteItem }
})
