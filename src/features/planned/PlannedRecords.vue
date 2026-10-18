<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import type { PlannedItem } from '@shared/types'
import { usePlannedStore } from '@/stores'
import FundStatCard from '@/components/fund/FundStatCard.vue'
import { formatMoney, formatSignedMoney, todayString, toDateString, fromDateString } from '@/composables/useFormat'

const store = usePlannedStore()
const { sortedItems, months } = storeToRefs(store)
const confirm = useConfirm()

// 月份篩選，總計跟著篩選結果
const ALL = 'all'
const monthFilter = ref(ALL)
const monthOptions = computed(() => [
  { label: '全部月份', value: ALL },
  ...months.value.map(m => ({ label: `${m.slice(0, 4)} 年 ${Number(m.slice(5))} 月`, value: m }))
])
const visibleItems = computed(() =>
  monthFilter.value === ALL ? sortedItems.value : sortedItems.value.filter(i => i.date.startsWith(monthFilter.value))
)
const totals = computed(() => store.totalsOf(visibleItems.value))

// 新增／編輯表單
type ItemType = PlannedItem['type']
const typeOptions: { label: string; value: ItemType }[] = [
  { label: '支出 (-)', value: 'expense' },
  { label: '收入 (+)', value: 'income' }
]

const formRef = ref<HTMLElement | null>(null)
const editingId = ref<string | null>(null)
const formType = ref<ItemType>('expense')
const formName = ref('')
const formAmount = ref<number | null>(null)
const formDate = ref(todayString())
const formNote = ref('')
const formError = ref('')

const formDateModel = computed<Date>({
  get: () => fromDateString(formDate.value),
  set: value => {
    if (value) formDate.value = toDateString(value)
  }
})

const resetForm = () => {
  editingId.value = null
  formName.value = ''
  formAmount.value = null
  formNote.value = ''
  formError.value = ''
}

const handleSubmit = () => {
  formError.value = ''
  if (!formName.value.trim()) {
    formError.value = '請輸入項目名稱'
    return
  }
  if (!formAmount.value || formAmount.value <= 0) {
    formError.value = '請輸入大於 0 的金額'
    return
  }

  const input = {
    type: formType.value,
    name: formName.value.trim(),
    amount: formAmount.value,
    date: formDate.value,
    note: formNote.value.trim() || undefined
  }
  if (editingId.value) store.updateItem(editingId.value, input)
  else store.addItem(input)
  resetForm()
}

const startEdit = async (item: PlannedItem) => {
  editingId.value = item.id
  formType.value = item.type
  formName.value = item.name
  formAmount.value = item.amount
  formDate.value = item.date
  formNote.value = item.note ?? ''
  formError.value = ''
  await nextTick()
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleDelete = (item: PlannedItem) => {
  confirm.require({
    header: '刪除確認',
    message: `確定要刪除「${item.name}」這筆預計${item.type === 'income' ? '收入' : '支出'}嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => {
      if (editingId.value === item.id) resetForm()
      store.deleteItem(item.id)
    }
  })
}

const isPast = (item: PlannedItem) => item.date < todayString()
</script>

<template>
  <div class="space-y-6">
    <!-- 總計卡片 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      <FundStatCard
        label="預計收入總計"
        icon="pi pi-arrow-down-left"
        label-class="text-emerald-500"
        value-class="font-bold text-emerald-600"
        :value="formatSignedMoney(totals.income, '+')"
      />
      <FundStatCard
        label="預計支出總計"
        icon="pi pi-arrow-up-right"
        label-class="text-rose-500"
        value-class="font-bold text-rose-600"
        :value="formatSignedMoney(totals.expense, '-')"
      />
      <FundStatCard
        label="預計淨額 (收入 - 支出)"
        icon="pi pi-calculator"
        label-class="text-indigo-500"
        :value-class="totals.net >= 0 ? 'font-extrabold text-indigo-600' : 'font-extrabold text-rose-600'"
        :value="formatMoney(totals.net)"
      />
      <FundStatCard label="紀錄筆數" icon="pi pi-list text-slate-500" :value="`${visibleItems.length} 筆`" />
    </div>

    <!-- 新增／編輯表單 -->
    <div ref="formRef" class="scroll-mt-6 space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 class="flex items-center gap-2 text-base font-bold text-slate-800">
        <i :class="editingId ? 'pi pi-pencil text-amber-500' : 'pi pi-plus-circle text-emerald-500'"></i>
        {{ editingId ? '編輯預計項目' : '新增預計項目' }}
      </h2>

      <div class="space-y-1">
        <span id="planned-type-label" class="block text-xs font-semibold text-slate-600">類型</span>
        <SelectButton
          v-model="formType"
          aria-labelledby="planned-type-label"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
          class="w-full sm:w-auto"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div class="space-y-1 sm:col-span-2">
          <label for="planned-name" class="text-xs font-semibold text-slate-600">項目名稱</label>
          <InputText
            id="planned-name"
            v-model="formName"
            placeholder="例如: 年終獎金 / 機票 / 保險費"
            size="small"
            fluid
            @keyup.enter="handleSubmit"
          />
        </div>

        <div class="space-y-1">
          <label for="planned-amount" class="text-xs font-semibold text-slate-600">金額</label>
          <InputNumber
            v-model="formAmount"
            input-id="planned-amount"
            placeholder="金額"
            mode="decimal"
            :min-fraction-digits="0"
            :min="0"
            prefix="$"
            size="small"
            fluid
          />
        </div>

        <div class="space-y-1">
          <label for="planned-date" class="text-xs font-semibold text-slate-600">預計日期</label>
          <DatePicker v-model="formDateModel" input-id="planned-date" date-format="yy-mm-dd" size="small" fluid />
        </div>

        <div class="space-y-1 sm:col-span-2">
          <label for="planned-note" class="text-xs font-semibold text-slate-600">備註 (選填)</label>
          <InputText id="planned-note" v-model="formNote" placeholder="補充說明" size="small" fluid />
        </div>
      </div>

      <Message v-if="formError" severity="error" size="small" variant="simple" icon="pi pi-exclamation-circle">
        {{ formError }}
      </Message>

      <div class="flex justify-end gap-2">
        <Button v-if="editingId" label="取消編輯" severity="secondary" text size="small" @click="resetForm" />
        <Button
          :label="editingId ? '儲存修改' : '新增'"
          icon="pi pi-check"
          size="small"
          class="min-w-28"
          @click="handleSubmit"
        />
      </div>
    </div>

    <!-- 預計項目列表 -->
    <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="flex items-center gap-2 text-base font-bold text-slate-800">
          <i class="pi pi-list text-indigo-500"></i>
          預計項目明細 (共 {{ visibleItems.length }} 筆)
        </h2>
        <Select
          v-model="monthFilter"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          aria-label="月份篩選"
          size="small"
          class="w-full sm:w-44"
        />
      </div>

      <div v-if="visibleItems.length === 0" class="p-8 text-center text-sm text-slate-400">
        目前沒有預計項目，請於上方新增。
      </div>

      <template v-else>
        <ul class="divide-y divide-slate-100">
          <li
            v-for="item in visibleItems"
            :key="item.id"
            class="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50/60"
            :class="{ 'bg-amber-50/40': editingId === item.id }"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="item.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'"
              >
                {{ item.type === 'expense' ? '支' : '收' }}
              </span>

              <div class="min-w-0">
                <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span class="truncate">{{ item.name }}</span>
                  <Tag v-if="isPast(item)" value="已過預計日" severity="secondary" class="shrink-0 text-xs" />
                </div>
                <div class="mt-0.5 truncate text-xs text-slate-400">
                  {{ item.date }}<template v-if="item.note"> · {{ item.note }}</template>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-1 sm:gap-3">
              <span
                class="text-base font-extrabold"
                :class="item.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'"
              >
                {{ formatSignedMoney(item.amount, item.type === 'expense' ? '-' : '+') }}
              </span>
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                aria-label="編輯"
                @click="startEdit(item)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                aria-label="刪除"
                @click="handleDelete(item)"
              />
            </div>
          </li>
        </ul>

        <!-- 總計列 -->
        <div
          class="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm"
        >
          <span class="text-emerald-600">收入 {{ formatSignedMoney(totals.income, '+') }}</span>
          <span class="text-rose-600">支出 {{ formatSignedMoney(totals.expense, '-') }}</span>
          <span class="font-extrabold" :class="totals.net >= 0 ? 'text-indigo-600' : 'text-rose-600'">
            總計 {{ formatMoney(totals.net) }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
