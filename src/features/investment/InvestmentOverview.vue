<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import ProgressBar from 'primevue/progressbar'
import { useInvestmentStore } from '@/stores'
import { formatMoney, formatSignedMoney } from '@/composables/useFormat'
import FundStatCard from '@/components/fund/FundStatCard.vue'
import FundTransactionForm from '@/components/fund/FundTransactionForm.vue'
import FundTransactionList from '@/components/fund/FundTransactionList.vue'

const store = useInvestmentStore()
const {
  accumulatedFromSalary,
  netAdjustments,
  currentBalance,
  targetAmount,
  progressPercentage,
  sortedTransactions
} = storeToRefs(store)

const targetInputId = `${useId()}-target`

// 目標金額 inline 編輯狀態
const isEditingTarget = ref(false)
const inputTarget = ref<number | null>(null)

function toggleEditTarget() {
  isEditingTarget.value = !isEditingTarget.value
  inputTarget.value = targetAmount.value || null
}

function saveTarget() {
  store.setTargetAmount(inputTarget.value ?? 0)
  isEditingTarget.value = false
}

const progressBarValue = computed(() => Math.min(Math.max(progressPercentage.value, 0), 100))
</script>

<template>
  <div class="space-y-6">
    <!-- 頂部概覽卡片 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      <FundStatCard
        label="薪資累積投資"
        icon="pi pi-wallet text-indigo-500"
        :value="formatMoney(accumulatedFromSalary)"
      />
      <FundStatCard
        label="臨時調整總計"
        icon="pi pi-arrows-h"
        label-class="text-emerald-500"
        value-class="font-bold text-emerald-600"
        :value="netAdjustments >= 0 ? formatSignedMoney(netAdjustments, '+') : formatSignedMoney(-netAdjustments, '-')"
      />
      <FundStatCard
        label="目前累積本金"
        icon="pi pi-chart-line"
        label-class="text-indigo-600"
        :value-class="currentBalance >= 0 ? 'font-extrabold text-indigo-600' : 'font-extrabold text-rose-600'"
        :value="formatMoney(currentBalance)"
      />
      <FundStatCard label="投資目標金額" icon="pi pi-flag" label-class="text-amber-500">
        <template #action>
          <Button
            :label="isEditingTarget ? '取消' : '修改'"
            link
            size="small"
            class="p-0 text-xs font-semibold"
            @click="toggleEditTarget"
          />
        </template>

        <div v-if="!isEditingTarget" class="text-2xl font-extrabold text-amber-600">
          {{ formatMoney(targetAmount) }}
        </div>
        <form v-else class="mt-1 flex items-center gap-1.5" @submit.prevent="saveTarget">
          <label :for="targetInputId" class="sr-only">投資目標金額</label>
          <InputNumber
            v-model="inputTarget"
            :input-id="targetInputId"
            mode="decimal"
            :min-fraction-digits="0"
            :min="0"
            placeholder="設定目標"
            size="small"
            fluid
          />
          <Button type="submit" label="儲存" size="small" class="shrink-0" />
        </form>
      </FundStatCard>
    </div>

    <!-- 目標達成進度條 -->
    <div class="space-y-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
          <i class="pi pi-compass text-amber-500"></i>
          投資目標達成進度
        </div>
        <div class="text-sm font-extrabold text-amber-600">{{ progressPercentage }}%</div>
      </div>

      <ProgressBar
        :value="progressBarValue"
        :show-value="false"
        class="h-3.5 rounded-full bg-slate-100"
        :pt="{ value: { class: 'rounded-full bg-linear-to-r from-amber-400 to-indigo-500' } }"
      />

      <div class="flex justify-between text-xs font-medium text-slate-400">
        <span>目前本金: {{ formatMoney(currentBalance) }}</span>
        <span>目標金額: {{ formatMoney(targetAmount) }}</span>
      </div>
    </div>

    <FundTransactionForm
      title="投資本金臨時調整 (增額 / 支出)"
      name-placeholder="例如: 股息再投資 / 資本贖回"
      accent="indigo"
      @submit="store.addTransaction"
    />

    <FundTransactionList
      title="投資本金臨時調整明細"
      empty-text="目前無任何投資本金臨時調整紀錄。"
      :transactions="sortedTransactions"
      accent="indigo"
      @delete="store.deleteTransaction"
    />
  </div>
</template>
