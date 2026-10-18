<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { FundTransaction } from '@shared/types'
import { fromDateString, toDateString, todayString } from '@/composables/useFormat'
import { ACCENT_BUTTON_CLASS, ACCENT_ICON_CLASS, type FundAccent } from './accent'

export type FundTransactionPayload = Omit<FundTransaction, 'id' | 'createdAt'>

const props = defineProps<{
  title: string
  namePlaceholder: string
  accent: FundAccent
}>()

const emit = defineEmits<{
  submit: [payload: FundTransactionPayload]
}>()

const uid = useId()
const ids = {
  type: `${uid}-type`,
  name: `${uid}-name`,
  amount: `${uid}-amount`,
  date: `${uid}-date`
}

const typeOptions: { label: string; value: FundTransaction['type'] }[] = [
  { label: '臨時增額 (+)', value: 'deposit' },
  { label: '臨時支出 (-)', value: 'expense' }
]

const formType = ref<FundTransaction['type']>('deposit')
const formName = ref('')
const formAmount = ref<number | null>(null)
const formDate = ref(todayString())
const formError = ref('')
const errorField = ref<'name' | 'amount' | null>(null)

// DatePicker 使用 Date 物件，資料存 YYYY-MM-DD 字串
const datePickerValue = computed<Date>({
  get: () => fromDateString(formDate.value),
  set: value => {
    if (value instanceof Date) formDate.value = toDateString(value)
  }
})

const accentIcon = computed(() => ACCENT_ICON_CLASS[props.accent])
const accentButton = computed(() => ACCENT_BUTTON_CLASS[props.accent])

function handleAdd() {
  formError.value = ''
  errorField.value = null
  if (!formName.value.trim()) {
    formError.value = '請輸入項目名稱'
    errorField.value = 'name'
    return
  }
  if (!formAmount.value || formAmount.value <= 0) {
    formError.value = '請輸入大於 0 的金額'
    errorField.value = 'amount'
    return
  }

  emit('submit', {
    type: formType.value,
    name: formName.value.trim(),
    amount: formAmount.value,
    date: formDate.value
  })

  formName.value = ''
  formAmount.value = null
}
</script>

<template>
  <div class="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <h2 class="flex items-center gap-2 text-base font-bold text-slate-800">
      <i class="pi pi-sliders-h" :class="accentIcon"></i>
      {{ title }}
    </h2>

    <form class="space-y-3" @submit.prevent="handleAdd">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <!-- 類型 -->
        <div class="space-y-1 lg:col-span-2">
          <span :id="ids.type" class="text-xs font-semibold text-slate-600">調整類型</span>
          <SelectButton
            v-model="formType"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
            fluid
            :aria-labelledby="ids.type"
          />
        </div>

        <!-- 項目名稱 -->
        <div class="space-y-1 lg:col-span-2">
          <label :for="ids.name" class="text-xs font-semibold text-slate-600">項目名稱</label>
          <InputText
            :id="ids.name"
            v-model="formName"
            :placeholder="namePlaceholder"
            :invalid="errorField === 'name'"
            size="small"
            fluid
          />
        </div>

        <!-- 金額 -->
        <div class="space-y-1">
          <label :for="ids.amount" class="text-xs font-semibold text-slate-600">金額</label>
          <InputNumber
            v-model="formAmount"
            :input-id="ids.amount"
            mode="decimal"
            :min-fraction-digits="0"
            :min="0"
            placeholder="金額"
            :invalid="errorField === 'amount'"
            size="small"
            fluid
          />
        </div>

        <!-- 日期 -->
        <div class="space-y-1">
          <label :for="ids.date" class="text-xs font-semibold text-slate-600">日期</label>
          <DatePicker
            v-model="datePickerValue"
            :input-id="ids.date"
            date-format="yy-mm-dd"
            size="small"
            fluid
          />
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Message v-if="formError" severity="error" size="small" variant="simple" icon="pi pi-exclamation-circle">
          {{ formError }}
        </Message>
        <Button
          type="submit"
          label="新增項目"
          icon="pi pi-plus"
          size="small"
          class="sm:ml-auto"
          :class="accentButton"
        />
      </div>
    </form>
  </div>
</template>
