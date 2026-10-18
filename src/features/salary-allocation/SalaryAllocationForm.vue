<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Divider from 'primevue/divider'
import { useSalaryAllocationForm } from './useSalaryAllocationForm'
import type { SalaryMoneyField } from './useSalaryAllocationForm'
import { formatMoney, formatSignedMoney, fromDateString, toDateString } from '@/composables/useFormat'

const { draft, netAmount, isLoading, isSaved, errors, saveAllocation } = useSalaryAllocationForm()

const moneyFields: { key: SalaryMoneyField; label: string; dot: string }[] = [
  { key: 'income', label: '薪資收入', dot: 'bg-emerald-500' },
  { key: 'investment', label: '投資規劃', dot: 'bg-amber-500' },
  { key: 'consumerFund', label: '消費基金', dot: 'bg-purple-500' },
  { key: 'allowance', label: '零用金', dot: 'bg-indigo-500' }
]

// DatePicker 使用 Date，資料保存 YYYY-MM-DD 字串
const paydayDate = computed<Date | null>({
  get: () => (/^\d{4}-\d{2}-\d{2}$/.test(draft.value.payday) ? fromDateString(draft.value.payday) : null),
  set: value => {
    draft.value.payday = value ? toDateString(value) : ''
  }
})

const saveLabel = computed(() => (isLoading.value ? '儲存中...' : isSaved.value ? '已儲存' : '儲存配置'))
</script>

<template>
  <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
    <div class="p-6 md:p-8">
      <!-- 基本設定區 -->
      <div>
        <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <i class="pi pi-calendar text-indigo-500 mr-2"></i>
          基本設定
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label for="salary-month" class="text-sm font-medium text-slate-600 block">薪水月份</label>
            <InputNumber
              v-model="draft.month"
              input-id="salary-month"
              :min="1"
              :max="12"
              :use-grouping="false"
              suffix=" 月"
              size="small"
              fluid
              :invalid="!!errors.month"
            />
            <Message v-if="errors.month" severity="error" size="small" variant="simple" icon="pi pi-exclamation-circle">
              {{ errors.month }}
            </Message>
          </div>

          <div class="space-y-1.5">
            <label for="salary-payday" class="text-sm font-medium text-slate-600 block">發薪日</label>
            <DatePicker
              v-model="paydayDate"
              input-id="salary-payday"
              date-format="yy-mm-dd"
              show-icon
              icon-display="input"
              size="small"
              fluid
              :invalid="!!errors.payday"
            />
            <Message v-if="errors.payday" severity="error" size="small" variant="simple" icon="pi pi-exclamation-circle">
              {{ errors.payday }}
            </Message>
          </div>
        </div>
      </div>

      <Divider class="my-8!" />

      <!-- 資金流動區 -->
      <div>
        <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <i class="pi pi-arrow-right-arrow-left text-emerald-500 mr-2"></i>
          資金流動
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 可填寫區 -->
          <div class="space-y-4">
            <div v-for="field in moneyFields" :key="field.key" class="space-y-1.5">
              <label :for="`salary-${field.key}`" class="text-sm font-medium text-slate-600 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="field.dot"></span>
                {{ field.label }}
              </label>
              <InputNumber
                v-model="draft[field.key]"
                :input-id="`salary-${field.key}`"
                mode="decimal"
                :min-fraction-digits="0"
                :min="0"
                prefix="$"
                size="small"
                fluid
                :invalid="!!errors[field.key]"
              />
              <Message
                v-if="errors[field.key]"
                severity="error"
                size="small"
                variant="simple"
                icon="pi pi-exclamation-circle"
              >
                {{ errors[field.key] }}
              </Message>
            </div>
          </div>

          <!-- 唯讀帶入區 -->
          <div class="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50 self-start">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-500 flex items-center gap-1">
                上月結餘 <i class="pi pi-lock text-xs text-slate-400"></i>
              </span>
              <span class="text-sm font-medium text-slate-600">{{ formatMoney(draft.previousBalance) }}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-500 flex items-center gap-1">
                固定費用 <i class="pi pi-lock text-xs text-slate-400"></i>
              </span>
              <span class="text-sm font-medium text-rose-500">{{ formatSignedMoney(draft.fixedExpenses || 0, '-') }}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-500 flex items-center gap-1">
                緊急備用金 <i class="pi pi-lock text-xs text-slate-400"></i>
              </span>
              <span class="text-sm font-medium text-blue-500">{{ formatSignedMoney(draft.emergencyFund || 0, '-') }}</span>
            </div>

            <div v-if="draft.netDraw" class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-500 flex items-center gap-1">
                動用本月淨額 <i class="pi pi-lock text-xs text-slate-400"></i>
              </span>
              <span class="text-sm font-medium text-indigo-500">{{ formatSignedMoney(draft.netDraw, '-') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 結算結果與儲存 -->
    <div
      class="bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-t-2 border-slate-50"
    >
      <div>
        <div class="text-slate-500 font-medium text-sm mb-1">本月淨額</div>
        <div
          class="text-4xl font-bold tracking-tight drop-shadow-sm"
          :class="netAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'"
        >
          {{ formatMoney(netAmount) }}
        </div>
      </div>

      <Button
        :label="saveLabel"
        :icon="isSaved && !isLoading ? 'pi pi-check' : undefined"
        :loading="isLoading"
        size="small"
        class="min-w-35"
        @click="saveAllocation"
      />
    </div>
  </div>
</template>
