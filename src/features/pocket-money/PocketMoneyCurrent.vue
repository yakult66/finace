<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import ProgressBar from 'primevue/progressbar'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { usePocketMoneyStore } from '@/stores'
import { formatMoney, formatSignedMoney, todayString, toDateString, fromDateString } from '@/composables/useFormat'
import { POCKET_CATEGORIES } from '@shared/types'
import type { PocketCategory, PocketMoneyTransaction } from '@shared/types'

const store = usePocketMoneyStore()
const confirm = useConfirm()

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// 當月紀錄（尚無資料時為未儲存的空紀錄）
const currentRecord = computed(() => store.getMonthRecord(currentYear, currentMonth))

// 當月薪資分配帶入之零用金 (即時動態連動)
const allocatedAllowance = computed(() => store.allocatedFor(currentRecord.value))

// 當月統計
const unspentAllowance = computed(() => store.unspentAllowance(currentRecord.value))
const categoryStats = computed(() => store.categoryStatistics(currentRecord.value.transactions))

// 本月淨額還能動用的金額（沒有薪資紀錄時為 null）
const availableNet = computed(() => store.availableNetFor(currentYear, currentMonth))

// 新增明細表單
type TxType = PocketMoneyTransaction['type']
const typeOptions: { label: string; value: TxType }[] = [
  { label: '支出 (-)', value: 'expense' },
  { label: '收入 (+)', value: 'income' },
  { label: '動用本月淨額 (+)', value: 'netDraw' }
]
const isNetDraw = computed(() => formType.value === 'netDraw')

const txBadge = (type: TxType) =>
  ({
    expense: { text: '支', class: 'bg-rose-50 text-rose-600' },
    income: { text: '收', class: 'bg-emerald-50 text-emerald-600' },
    netDraw: { text: '淨', class: 'bg-indigo-50 text-indigo-600' }
  })[type]
const categoryOptions = [...POCKET_CATEGORIES]

const formType = ref<TxType>('expense')
const formCategory = ref<PocketCategory>('餐費')
const formName = ref('')
const formAmount = ref<number | null>(null)
const formDate = ref(todayString())
const formError = ref('')

const formDateModel = computed<Date>({
  get: () => fromDateString(formDate.value),
  set: (value) => {
    if (value) formDate.value = toDateString(value)
  }
})

const handleAdd = () => {
  formError.value = ''
  if (!isNetDraw.value && !formName.value.trim()) {
    formError.value = '請輸入項目名稱'
    return
  }
  if (!formAmount.value || formAmount.value <= 0) {
    formError.value = '請輸入大於 0 的金額'
    return
  }
  if (isNetDraw.value) {
    if (availableNet.value === null) {
      formError.value = '本月尚未儲存薪資配置，無法動用本月淨額'
      return
    }
    if (formAmount.value > availableNet.value) {
      formError.value = `動用金額不可超過本月淨額 ${formatMoney(availableNet.value)}`
      return
    }
  }

  store.addTransaction(currentYear, currentMonth, {
    type: formType.value,
    // 動用本月淨額不屬於花費類別，統一記為「其他」且不列入類別統計
    category: isNetDraw.value ? '其他' : formCategory.value,
    name: formName.value.trim() || '動用本月淨額',
    amount: formAmount.value,
    date: formDate.value
  })

  // 重置表單
  formName.value = ''
  formAmount.value = null
}

const handleDelete = (tx: PocketMoneyTransaction) => {
  confirm.require({
    header: '刪除確認',
    message:
      tx.type === 'netDraw'
        ? `確定要刪除「${tx.name}」嗎？金額 ${formatMoney(tx.amount)} 將退回本月淨額。`
        : `確定要刪除「${tx.name}」這筆紀錄嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => {
      store.deleteTransaction(currentYear, currentMonth, tx.id)
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頂部概覽卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div class="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
          <i class="pi pi-wallet text-indigo-500"></i> 本月薪資分配零用金
        </div>
        <div class="text-2xl font-bold text-slate-800">
          {{ formatMoney(allocatedAllowance) }}
        </div>
        <p v-if="categoryStats.totalNetDraw > 0" class="text-xs text-indigo-500 font-medium mt-1">
          + 動用本月淨額 {{ formatMoney(categoryStats.totalNetDraw) }}
        </p>
        <p v-if="allocatedAllowance === 0" class="text-xs text-amber-600 font-medium mt-1">
          💡 請至「當月薪資配置」設定零用金並點選儲存
        </p>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div class="text-xs font-semibold text-emerald-500 mb-1 flex items-center gap-1">
          <i class="pi pi-arrow-down-left"></i> 本月總收入
        </div>
        <div class="text-2xl font-bold text-emerald-600">
          {{ formatSignedMoney(categoryStats.totalIncome, '+') }}
        </div>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div class="text-xs font-semibold text-rose-500 mb-1 flex items-center gap-1">
          <i class="pi pi-arrow-up-right"></i> 本月總支出
        </div>
        <div class="text-2xl font-bold text-rose-600">
          {{ formatSignedMoney(categoryStats.totalExpense, '-') }}
        </div>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div class="text-xs font-semibold text-indigo-500 mb-1 flex items-center gap-1">
          <i class="pi pi-sparkles"></i> 剩餘可動用零用金
        </div>
        <div
          class="text-2xl font-extrabold"
          :class="unspentAllowance >= 0 ? 'text-indigo-600' : 'text-rose-600'"
        >
          {{ formatMoney(unspentAllowance) }}
        </div>
      </div>
    </div>

    <!-- 類別花費與佔比統計區 -->
    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
        <i class="pi pi-chart-bar text-indigo-500"></i>
        各類別花費統計與佔比
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="stat in categoryStats.stats"
          :key="stat.category"
          class="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700">{{ stat.category }}</span>
            <span class="text-xs font-semibold text-indigo-600">{{ stat.percentage }}%</span>
          </div>

          <div class="text-lg font-bold text-slate-800">
            {{ formatMoney(stat.amount) }}
          </div>

          <ProgressBar :value="Math.min(stat.percentage, 100)" :show-value="false" class="h-2" />
        </div>
      </div>
    </div>

    <!-- 新增收支明細表單 -->
    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
        <i class="pi pi-plus-circle text-emerald-500"></i>
        新增當月零用金收支項目
      </h2>

      <!-- 類型 -->
      <div class="space-y-1">
        <span id="pm-type-label" class="block text-xs font-semibold text-slate-600">收支類型</span>
        <SelectButton
          v-model="formType"
          aria-labelledby="pm-type-label"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
          class="w-full sm:w-auto"
        />
        <p v-if="isNetDraw" class="text-xs font-medium pt-1" :class="availableNet === null ? 'text-amber-600' : 'text-indigo-500'">
          <template v-if="availableNet === null">💡 本月尚未儲存薪資配置，無法動用本月淨額</template>
          <template v-else>
            本月淨額目前可動用 {{ formatMoney(availableNet) }}，動用後會加入本月零用金並從本月淨額扣除
          </template>
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <!-- 類別 (只能從固定選單選) -->
        <div v-if="!isNetDraw" class="space-y-1">
          <label for="pm-category" class="text-xs font-semibold text-slate-600">固定類別</label>
          <Select
            v-model="formCategory"
            input-id="pm-category"
            :options="categoryOptions"
            size="small"
            fluid
          />
        </div>

        <!-- 名稱 -->
        <div class="space-y-1 col-span-1 sm:col-span-2" :class="{ 'lg:col-span-3': isNetDraw }">
          <label for="pm-name" class="text-xs font-semibold text-slate-600">{{ isNetDraw ? '動用原因 (選填)' : '項目名稱' }}</label>
          <InputText
            id="pm-name"
            v-model="formName"
            :placeholder="isNetDraw ? '例如: 零用金不夠、聚餐' : '例如: 午餐便當 / 悠遊卡加值'"
            size="small"
            fluid
            @keyup.enter="handleAdd"
          />
        </div>

        <!-- 金額 -->
        <div class="space-y-1">
          <label for="pm-amount" class="text-xs font-semibold text-slate-600">金額</label>
          <InputNumber
            v-model="formAmount"
            input-id="pm-amount"
            placeholder="金額"
            mode="decimal"
            :min-fraction-digits="0"
            :min="0"
            size="small"
            fluid
          />
        </div>

        <!-- 日期 -->
        <div class="space-y-1">
          <label for="pm-date" class="text-xs font-semibold text-slate-600">日期</label>
          <DatePicker
            v-model="formDateModel"
            input-id="pm-date"
            date-format="yy-mm-dd"
            size="small"
            fluid
          />
        </div>

        <!-- 按鈕 -->
        <div class="flex items-end">
          <Button label="新增" icon="pi pi-check" size="small" fluid @click="handleAdd" />
        </div>
      </div>

      <Message v-if="formError" severity="error" size="small" variant="simple" icon="pi pi-exclamation-circle">
        {{ formError }}
      </Message>
    </div>

    <!-- 收支明細列表 -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
          <i class="pi pi-list text-indigo-500"></i>
          本月零用金明細列表 (共 {{ currentRecord.transactions.length }} 筆)
        </h2>
      </div>

      <div v-if="currentRecord.transactions.length === 0" class="p-8 text-center text-slate-400 text-sm">
        當月尚無零用金收支紀錄，請於上方新增。
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="tx in currentRecord.transactions"
          :key="tx.id"
          class="p-4 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <span
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              :class="txBadge(tx.type).class"
            >
              {{ txBadge(tx.type).text }}
            </span>

            <div>
              <div class="text-sm font-bold text-slate-800 flex items-center gap-2">
                {{ tx.name }}
                <Tag v-if="tx.type === 'netDraw'" value="動用本月淨額" severity="info" class="text-xs" />
                <Tag v-else :value="tx.category" severity="secondary" class="text-xs" />
              </div>
              <div class="text-xs text-slate-400 mt-0.5">
                {{ tx.date }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <span
              class="text-base font-extrabold"
              :class="{ expense: 'text-rose-600', income: 'text-emerald-600', netDraw: 'text-indigo-600' }[tx.type]"
            >
              {{ formatSignedMoney(tx.amount, tx.type === 'expense' ? '-' : '+') }}
            </span>

            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              aria-label="刪除"
              @click="handleDelete(tx)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
