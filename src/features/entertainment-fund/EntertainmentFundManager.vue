<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useEntertainmentStore } from '@/stores'
import { formatMoney, formatSignedMoney } from '@/composables/useFormat'
import FundStatCard from '@/components/fund/FundStatCard.vue'
import FundTransactionForm from '@/components/fund/FundTransactionForm.vue'
import FundTransactionList from '@/components/fund/FundTransactionList.vue'

const store = useEntertainmentStore()
const { accumulatedFromSalary, totalDeposits, totalExpenses, currentBalance, sortedTransactions } = storeToRefs(store)
</script>

<template>
  <div class="space-y-6">
    <!-- 概覽卡片 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      <FundStatCard
        label="薪資累積消費基金"
        icon="pi pi-wallet text-purple-500"
        :value="formatMoney(accumulatedFromSalary)"
      />
      <FundStatCard
        label="臨時增額總計"
        icon="pi pi-arrow-down-left"
        label-class="text-emerald-500"
        value-class="font-bold text-emerald-600"
        :value="formatSignedMoney(totalDeposits, '+')"
      />
      <FundStatCard
        label="臨時支出總計"
        icon="pi pi-arrow-up-right"
        label-class="text-rose-500"
        value-class="font-bold text-rose-600"
        :value="formatSignedMoney(totalExpenses, '-')"
      />
      <FundStatCard
        label="娛樂基金目前總額"
        icon="pi pi-gift"
        label-class="text-purple-600"
        :value-class="currentBalance >= 0 ? 'font-extrabold text-purple-600' : 'font-extrabold text-rose-600'"
        :value="formatMoney(currentBalance)"
      />
    </div>

    <FundTransactionForm
      title="娛樂基金臨時調整 (增額 / 支出)"
      name-placeholder="例如: 門票收入 / 旅遊大額花費"
      accent="purple"
      @submit="store.addTransaction"
    />

    <FundTransactionList
      title="娛樂基金臨時調整明細"
      empty-text="目前無任何娛樂基金臨時調整紀錄。"
      :transactions="sortedTransactions"
      accent="purple"
      @delete="store.deleteTransaction"
    />
  </div>
</template>
