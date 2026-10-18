<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { FixedExpenseSnapshotItem, SalaryAllocation } from '@shared/types'
import { useSalaryStore, useFixedExpensesStore } from '@/stores'
import { netAmountOf } from '@/features/salary-allocation/useSalaryAllocationForm'
import { formatMoney } from '@/composables/useFormat'

type EditableField = 'income' | 'investment' | 'consumerFund' | 'allowance' | 'emergencyFund'

const salary = useSalaryStore()
const fixed = useFixedExpensesStore()
const { records } = storeToRefs(salary)
const confirm = useConfirm()
const toast = useToast()

// 排序：預設依月份降冪排序 (新月份在前)
const sortOrder = ref<'desc' | 'asc'>('desc')

const sortedHistory = computed(() => {
  const abs = (r: SalaryAllocation) => salary.yearOf(r) * 12 + Number(r.month)
  return [...records.value].sort((a, b) => (sortOrder.value === 'desc' ? abs(b) - abs(a) : abs(a) - abs(b)))
})

const summaryFields: { key: EditableField | 'fixedExpenses'; label: string; card: string; text: string }[] = [
  { key: 'income', label: '薪資收入', card: 'bg-emerald-50/60 border-emerald-100/50', text: 'text-emerald-600' },
  { key: 'investment', label: '投資規劃', card: 'bg-amber-50/60 border-amber-100/50', text: 'text-amber-600' },
  { key: 'consumerFund', label: '消費基金', card: 'bg-purple-50/60 border-purple-100/50', text: 'text-purple-600' },
  { key: 'allowance', label: '零用金', card: 'bg-indigo-50/60 border-indigo-100/50', text: 'text-indigo-600' },
  { key: 'fixedExpenses', label: '固定支出', card: 'bg-rose-50/60 border-rose-100/50', text: 'text-rose-600' },
  { key: 'emergencyFund', label: '緊急備用金', card: 'bg-blue-50/60 border-blue-100/50', text: 'text-blue-600' }
]

const editFields: { key: EditableField; label: string }[] = [
  { key: 'income', label: '薪資收入' },
  { key: 'investment', label: '投資規劃' },
  { key: 'consumerFund', label: '消費基金' },
  { key: 'allowance', label: '零用金' },
  { key: 'emergencyFund', label: '緊急備用金' }
]

// 展開固定費用細項狀態
const expandedItems = ref<Record<string, boolean>>({})
const toggleExpand = (id: string) => {
  expandedItems.value[id] = !expandedItems.value[id]
}

// 編輯視窗狀態
const isEditModalOpen = ref(false)
const editingDraft = ref<SalaryAllocation | null>(null)

const openEditModal = (record: SalaryAllocation) => {
  const copy = JSON.parse(JSON.stringify(record)) as SalaryAllocation
  if (!copy.allowance) copy.allowance = 0
  if (!copy.fixedExpensesSnapshot) copy.fixedExpensesSnapshot = []
  editingDraft.value = copy
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
}

const recalcFixedTotal = () => {
  if (editingDraft.value?.fixedExpensesSnapshot) {
    editingDraft.value.fixedExpenses = editingDraft.value.fixedExpensesSnapshot.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    )
  }
}

// 細項金額變更時，固定該金額（之後固定支出清單變動不覆蓋），並更新固定費用總和
const onSnapshotAmountChange = (item: FixedExpenseSnapshotItem, value: number | null) => {
  item.amount = value ?? 0
  item.locked = true
  recalcFixedTotal()
}

// 取消固定：一般項目恢復為目前固定支出清單的金額
const unlockSnapshotItem = (item: FixedExpenseSnapshotItem) => {
  item.locked = false
  const source = fixed.fixedExpenses.find(f => f.id === item.sourceId)
  if (source && !item.linkedLargeExpenseId) item.amount = source.amount
  recalcFixedTotal()
}

// 儲存編輯後的歷史紀錄
const handleSaveEdit = async () => {
  const updated = editingDraft.value
  if (!updated) return
  const oldRecord = records.value.find(r => r.id === updated.id)

  if (oldRecord) {
    // 細項快照與大額支出累計金額連動
    if (updated.fixedExpensesSnapshot && oldRecord.fixedExpensesSnapshot) {
      for (const newItem of updated.fixedExpensesSnapshot) {
        if (!newItem.linkedLargeExpenseId) continue
        const oldItem = oldRecord.fixedExpensesSnapshot.find(o => o.linkedLargeExpenseId === newItem.linkedLargeExpenseId)
        const diff = Number(newItem.amount || 0) - Number(oldItem?.amount || 0)
        if (diff !== 0) fixed.addAccumulatedAmount(newItem.linkedLargeExpenseId, diff)
      }
    }

    try {
      await salary.save(updated)
    } catch (e) {
      console.error('儲存失敗:', e)
      toast.add({ severity: 'error', summary: '儲存失敗', detail: '請稍後再試', life: 3000 })
    }
  }

  closeEditModal()
}

// 刪除歷史紀錄
const deleteRecord = (id: string) => {
  confirm.require({
    header: '刪除確認',
    message: '確定要刪除此筆歷史紀錄嗎？',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: async () => {
      try {
        await salary.remove(id)
      } catch (e) {
        console.error('刪除失敗:', e)
        toast.add({ severity: 'error', summary: '刪除失敗', detail: '請稍後再試', life: 3000 })
      }
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頂部概覽 -->
    <div
      class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i class="pi pi-history text-indigo-500"></i>
          薪資分配歷史紀錄與快照
        </h2>
        <p class="text-xs text-slate-500 mt-1">獨立檢視與編輯過去各月份的薪資分配、固定項目細項金額與大額支出連動。</p>
      </div>
      <div class="flex items-center gap-3">
        <Button
          :label="sortOrder === 'desc' ? '最新月份在前' : '最舊月份在前'"
          :icon="sortOrder === 'desc' ? 'pi pi-sort-amount-down' : 'pi pi-sort-amount-up'"
          severity="secondary"
          outlined
          size="small"
          @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
        />

        <div class="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-center">
          <div class="text-xs text-slate-400 font-medium">總紀錄月數</div>
          <div class="text-lg font-bold text-indigo-600">{{ sortedHistory.length }} 個月</div>
        </div>
      </div>
    </div>

    <!-- 無紀錄提示 -->
    <div v-if="sortedHistory.length === 0" class="bg-white rounded-3xl border border-slate-100 p-12 text-center">
      <div class="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <i class="pi pi-inbox"></i>
      </div>
      <h3 class="text-base font-bold text-slate-700">尚無歷史紀錄</h3>
      <p class="text-xs text-slate-400 mt-1">前往「薪資分配」頁籤完成首次儲存後，紀錄即會顯示於此。</p>
    </div>

    <!-- 歷史紀錄列表 (按月份排序) -->
    <div v-else class="space-y-4">
      <div
        v-for="record in sortedHistory"
        :key="record.id"
        class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <Tag :value="`${salary.yearOf(record)} 年 ${record.month} 月`" class="px-3! py-1.5! text-sm!" />
            <div class="text-xs text-slate-400 flex items-center gap-1">
              <i class="pi pi-calendar text-xs"></i> 發薪日：{{ record.payday }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button
              label="編輯歷史紀錄與細項"
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              @click="openEditModal(record)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              aria-label="刪除"
              @click="deleteRecord(record.id)"
            />
          </div>
        </div>

        <!-- 數據卡片區域 -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-4 text-center">
          <div v-for="field in summaryFields" :key="field.key" class="p-3 rounded-2xl border" :class="field.card">
            <div class="text-xs font-medium mb-0.5" :class="field.text">{{ field.label }}</div>
            <div class="text-sm font-bold text-slate-800">{{ formatMoney(record[field.key]) }}</div>
          </div>

          <div class="bg-slate-100/80 p-3 rounded-2xl border border-slate-200/60 col-span-2 sm:col-span-1">
            <div class="text-xs text-slate-500 font-medium mb-0.5">本月淨額</div>
            <div
              class="text-sm font-extrabold"
              :class="netAmountOf(record) >= 0 ? 'text-emerald-600' : 'text-rose-600'"
            >
              {{ formatMoney(netAmountOf(record)) }}
            </div>
          </div>
        </div>

        <!-- 固定支出細項快照展開 -->
        <div v-if="record.fixedExpensesSnapshot?.length" class="mt-4 pt-3 border-t border-slate-100">
          <Button
            :label="
              expandedItems[record.id]
                ? '收起固定支出細項'
                : `檢視當月固定支出細項快照 (${record.fixedExpensesSnapshot.length} 項)`
            "
            :icon="expandedItems[record.id] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
            link
            size="small"
            class="px-0!"
            @click="toggleExpand(record.id)"
          />

          <div
            v-if="expandedItems[record.id]"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3 bg-slate-50 p-3 rounded-2xl"
          >
            <div
              v-for="item in record.fixedExpensesSnapshot"
              :key="item.id || item.name"
              class="bg-white px-3 py-2 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 text-xs"
            >
              <span class="text-slate-600 font-medium truncate">{{ item.name }}</span>
              <span class="text-slate-800 font-bold shrink-0">
                <i v-if="item.locked" class="pi pi-lock text-[10px] text-amber-500 mr-1" title="已固定金額"></i>
                {{ formatMoney(item.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 歷史紀錄編輯視窗 -->
    <Dialog
      v-model:visible="isEditModalOpen"
      modal
      :draggable="false"
      class="mx-4 w-full max-w-3xl"
      @after-hide="editingDraft = null"
    >
      <template #header>
        <div>
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i class="pi pi-sliders-h text-indigo-500"></i>
            客製編輯 {{ editingDraft?.month }} 月歷史紀錄與細項快照
          </h3>
          <p class="text-xs text-slate-400 mt-1">修改紀錄金額或固定細項快照，大額支出累計將自動連動更新。</p>
        </div>
      </template>

      <div v-if="editingDraft" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="field in editFields" :key="field.key" class="space-y-1">
            <label :for="`edit-${field.key}`" class="text-xs font-semibold text-slate-600">{{ field.label }}</label>
            <InputNumber
              v-model="editingDraft[field.key]"
              :input-id="`edit-${field.key}`"
              mode="decimal"
              :min-fraction-digits="0"
              :min="0"
              size="small"
              fluid
            />
          </div>
        </div>

        <!-- 固定費用細項編輯快照區 -->
        <div
          v-if="editingDraft.fixedExpensesSnapshot?.length"
          class="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-bold text-slate-700">
              當月固定項目細項快照 (修改過的金額會固定，不再跟著固定支出清單變動)
            </span>
            <span class="text-xs font-bold text-rose-500">固定總計: {{ formatMoney(editingDraft.fixedExpenses) }}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="(item, index) in editingDraft.fixedExpensesSnapshot"
              :key="item.id || item.name"
              class="bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 text-xs"
            >
              <label :for="`edit-snapshot-${index}`" class="text-slate-700 font-medium truncate">{{ item.name }}</label>
              <Button
                v-if="item.locked"
                title="已固定金額，點擊取消固定"
                icon="pi pi-lock"
                severity="warn"
                text
                rounded
                size="small"
                class="ml-auto shrink-0"
                aria-label="取消固定金額"
                @click="unlockSnapshotItem(item)"
              />
              <InputNumber
                :model-value="item.amount"
                :input-id="`edit-snapshot-${index}`"
                mode="decimal"
                :min-fraction-digits="0"
                :min="0"
                prefix="$"
                size="small"
                class="w-32 shrink-0"
                input-class="w-full text-right"
                @update:model-value="onSnapshotAmountChange(item, $event)"
              />
            </div>
          </div>
        </div>

        <!-- 試算淨額 -->
        <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
          <span class="text-sm font-semibold text-indigo-900">試算淨額</span>
          <span
            class="text-xl font-extrabold"
            :class="netAmountOf(editingDraft) >= 0 ? 'text-emerald-600' : 'text-rose-600'"
          >
            {{ formatMoney(netAmountOf(editingDraft)) }}
          </span>
        </div>
      </div>

      <template #footer>
        <Button label="取消" severity="secondary" text size="small" @click="closeEditModal" />
        <Button label="儲存歷史變更" size="small" @click="handleSaveEdit" />
      </template>
    </Dialog>
  </div>
</template>
