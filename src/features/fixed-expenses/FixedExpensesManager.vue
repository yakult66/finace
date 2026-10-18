<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Tag from 'primevue/tag'
import type { FixedExpense, LargeExpense } from '@shared/types'
import { useFixedExpensesStore } from '@/stores'
import { formatMoney } from '@/composables/useFormat'

const store = useFixedExpensesStore()
const { fixedExpenses, largeExpenses, totalFixedExpenses } = storeToRefs(store)
const confirm = useConfirm()

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1} 月`, value: i + 1 }))

// 一般支出表單狀態
const newFixedName = ref('')
const newFixedAmount = ref<number | null>(null)

const addFixed = () => {
  if (!newFixedName.value || !newFixedAmount.value) return
  store.addFixedExpense({ name: newFixedName.value, amount: newFixedAmount.value })
  newFixedName.value = ''
  newFixedAmount.value = null
}

const updateFixedAmount = (id: string, amount: number | null) => {
  store.updateFixedExpense(id, { amount: amount ?? 0 })
}

const confirmDeleteFixed = (expense: FixedExpense) => {
  confirm.require({
    header: '刪除固定支出',
    message: `確定要刪除「${expense.name}」嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => store.deleteFixedExpense(expense.id)
  })
}

// 臨時新增資金狀態
const tempAmounts = ref<Record<string, number | null>>({})

const submitTempAmount = (id: string) => {
  const amount = tempAmounts.value[id]
  if (amount && amount > 0) {
    store.addAccumulatedAmount(id, amount)
    tempAmounts.value[id] = null
  }
}

// 大額支出表單狀態
const newLargeName = ref('')
const newLargeTotal = ref<number | null>(null)
const newLargeTargetMonth = ref<number>(new Date().getMonth() + 1)
const newLargeIsAveraged = ref(true)

const addLarge = () => {
  if (!newLargeName.value || !newLargeTotal.value || !newLargeTargetMonth.value) return
  store.addLargeExpense({
    name: newLargeName.value,
    totalAmount: newLargeTotal.value,
    accumulatedAmount: 0,
    targetMonth: newLargeTargetMonth.value,
    isAveraged: newLargeIsAveraged.value
  })
  newLargeName.value = ''
  newLargeTotal.value = null
  newLargeTargetMonth.value = new Date().getMonth() + 1
  newLargeIsAveraged.value = true
}

const confirmDeleteLarge = (expense: LargeExpense) => {
  confirm.require({
    header: '刪除大額支出',
    message: expense.isAveraged
      ? `確定要刪除「${expense.name}」嗎？連動的每月均攤項目也會一併移除。`
      : `確定要刪除「${expense.name}」嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => store.deleteLargeExpense(expense.id)
  })
}

// 供模板計算差額與繳款月份顯示的 Helper
const getRemaining = (exp: LargeExpense) => Math.max(0, exp.totalAmount - exp.accumulatedAmount)
const formatPaymentMonth = (paymentMonth: string) => {
  const [year, month] = paymentMonth.split('-')
  return `${year} 年 ${Number(month)} 月`
}
</script>

<template>
  <div class="space-y-6">
    <!-- 一般固定支出區塊 -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-6 md:p-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-slate-800 flex items-center">
            <i class="pi pi-receipt text-rose-500 mr-2"></i>
            一般固定支出
          </h2>
          <div class="text-sm font-medium text-slate-500">
            總計：<span class="text-rose-500 font-bold">{{ formatMoney(totalFixedExpenses) }}</span>
          </div>
        </div>

        <!-- 列表 -->
        <div class="space-y-3 mb-6">
          <div
            v-for="expense in fixedExpenses"
            :key="expense.id"
            class="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:border-slate-200 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <i
                v-if="expense.linkedLargeExpenseId"
                class="pi pi-link text-indigo-400 text-xs"
                title="由大額支出連動產生"
              ></i>
              <div class="font-medium text-slate-700 truncate">{{ expense.name }}</div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <!-- 連動項目由大額支出自動計算，僅供檢視 -->
              <template v-if="expense.linkedLargeExpenseId">
                <Tag value="自動均攤" severity="info" class="text-xs!" />
                <div class="w-28 text-right font-bold text-slate-800 px-2">{{ formatMoney(expense.amount) }}</div>
                <div class="w-8"></div>
              </template>
              <template v-else>
                <InputNumber
                  :model-value="expense.amount"
                  mode="decimal"
                  :min-fraction-digits="0"
                  :min="0"
                  prefix="$"
                  size="small"
                  :aria-label="`${expense.name} 金額`"
                  input-class="w-28 text-right font-bold"
                  @update:model-value="updateFixedAmount(expense.id, $event)"
                />
                <Button
                  icon="pi pi-trash"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  aria-label="刪除"
                  class="hover:text-rose-500!"
                  @click="confirmDeleteFixed(expense)"
                />
              </template>
            </div>
          </div>

          <div v-if="fixedExpenses.length === 0" class="text-center py-6 text-slate-400 text-sm">
            目前沒有固定支出項目
          </div>
        </div>

        <!-- 新增欄位 -->
        <div class="flex flex-col sm:flex-row gap-3 items-end bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
          <div class="flex-1 w-full space-y-1.5">
            <label for="fixed-name" class="block text-xs font-medium text-slate-500">項目名稱</label>
            <InputText
              id="fixed-name"
              v-model="newFixedName"
              placeholder="例如：手機費、房租"
              size="small"
              fluid
              @keyup.enter="addFixed"
            />
          </div>
          <div class="flex-1 w-full space-y-1.5">
            <label for="fixed-amount" class="block text-xs font-medium text-slate-500">金額</label>
            <InputNumber
              v-model="newFixedAmount"
              input-id="fixed-amount"
              mode="decimal"
              :min-fraction-digits="0"
              :min="0"
              placeholder="金額"
              size="small"
              fluid
            />
          </div>
          <Button
            label="新增"
            icon="pi pi-plus"
            size="small"
            severity="contrast"
            class="w-full sm:w-auto"
            :disabled="!newFixedName || !newFixedAmount"
            @click="addFixed"
          />
        </div>
      </div>
    </div>

    <!-- 大額支出區塊 -->
    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-6 md:p-8">
        <h2 class="text-lg font-bold text-slate-800 mb-6 flex items-center">
          <i class="pi pi-car text-indigo-500 mr-2"></i>
          大額支出項目
        </h2>

        <!-- 列表 -->
        <div class="space-y-4 mb-8">
          <div
            v-for="expense in largeExpenses"
            :key="expense.id"
            class="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50"
          >
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="font-bold text-slate-800 text-lg">{{ expense.name }}</div>
                <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                  <span>
                    <i class="pi pi-calendar mr-1"></i>
                    預計繳款：{{ formatPaymentMonth(expense.paymentMonth) }}
                  </span>
                  <Tag v-if="expense.isAveraged" icon="pi pi-sync" value="自動均攤中" severity="info" rounded class="text-xs!" />
                  <Tag
                    v-if="expense.lastProcessedMonth"
                    icon="pi pi-check-circle"
                    :value="`已扣 ${expense.lastProcessedMonth}`"
                    severity="success"
                    rounded
                    class="text-xs!"
                  />
                </div>
              </div>
              <Button
                icon="pi pi-trash"
                severity="secondary"
                text
                rounded
                size="small"
                aria-label="刪除"
                class="hover:text-rose-500!"
                @click="confirmDeleteLarge(expense)"
              />
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-100 items-end">
              <div>
                <div class="text-xs text-slate-400 mb-1">目標總金額</div>
                <div class="font-bold text-slate-700">{{ formatMoney(expense.totalAmount) }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-400 mb-1">已有金額</div>
                <div class="font-bold text-indigo-600">{{ formatMoney(expense.accumulatedAmount) }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-400 mb-1">還差多少</div>
                <div class="font-bold text-rose-500">{{ formatMoney(getRemaining(expense)) }}</div>
              </div>

              <!-- 臨時項目新增 -->
              <div>
                <label :for="`temp-${expense.id}`" class="block text-xs text-slate-400 mb-1">臨時存入</label>
                <div class="flex gap-2">
                  <InputNumber
                    v-model="tempAmounts[expense.id]"
                    :input-id="`temp-${expense.id}`"
                    mode="decimal"
                    :min-fraction-digits="0"
                    :min="0"
                    placeholder="金額"
                    size="small"
                    fluid
                    class="min-w-0 flex-1"
                    @keyup.enter="submitTempAmount(expense.id)"
                  />
                  <Button
                    icon="pi pi-plus"
                    size="small"
                    aria-label="存入"
                    :disabled="!tempAmounts[expense.id]"
                    @click="submitTempAmount(expense.id)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="largeExpenses.length === 0" class="text-center py-6 text-slate-400 text-sm">
            目前沒有大額支出項目
          </div>
        </div>

        <!-- 新增欄位 -->
        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <h3 class="text-sm font-bold text-slate-700 mb-4">新增大額支出</h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div class="space-y-1.5">
              <label for="large-name" class="block text-xs font-medium text-slate-500">項目名稱</label>
              <InputText id="large-name" v-model="newLargeName" placeholder="例如：保費、旅遊" size="small" fluid />
            </div>

            <div class="space-y-1.5">
              <label for="large-total" class="block text-xs font-medium text-slate-500">總金額</label>
              <InputNumber
                v-model="newLargeTotal"
                input-id="large-total"
                mode="decimal"
                :min-fraction-digits="0"
                :min="0"
                placeholder="總額"
                size="small"
                fluid
              />
            </div>

            <div class="space-y-1.5">
              <label for="large-month" class="block text-xs font-medium text-slate-500">每年繳款月份</label>
              <Select
                v-model="newLargeTargetMonth"
                label-id="large-month"
                :options="monthOptions"
                option-label="label"
                option-value="value"
                size="small"
                fluid
              />
            </div>

            <div class="flex items-center gap-2 h-9 px-2">
              <ToggleSwitch v-model="newLargeIsAveraged" input-id="large-averaged" />
              <label for="large-averaged" class="cursor-pointer text-sm text-slate-600 font-medium select-none">
                自動均攤至固定支出
              </label>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <Button
              label="新增項目"
              icon="pi pi-plus"
              size="small"
              :disabled="!newLargeName || !newLargeTotal || !newLargeTargetMonth"
              @click="addLarge"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
