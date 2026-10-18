<script setup lang="ts">
import { ref, computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import { useSalaryStore, usePocketMoneyStore } from '@/stores'
import { netAmountOf } from '@/stores/salary'
import { formatMoney } from '@/composables/useFormat'
import PocketMoneyCurrent from './PocketMoneyCurrent.vue'

const salary = useSalaryStore()
const pocket = usePocketMoneyStore()

// 只能補登本月以前的月份，預設上個月
const now = new Date()
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const selected = ref<Date>(lastMonth)

const year = computed(() => selected.value.getFullYear())
const month = computed(() => selected.value.getMonth() + 1)
const nextYear = computed(() => (month.value === 12 ? year.value + 1 : year.value))
const nextMonth = computed(() => (month.value === 12 ? 1 : month.value + 1))

const selectedModel = computed<Date>({
  get: () => selected.value,
  set: value => {
    if (value) selected.value = new Date(value.getFullYear(), value.getMonth(), 1)
  }
})

const salaryRecord = computed(() => salary.findByMonth(year.value, month.value))
const pocketRecord = computed(() => pocket.getMonthRecord(year.value, month.value))
</script>

<template>
  <div class="space-y-6">
    <!-- 補登月份選擇 -->
    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
            <i class="pi pi-calendar-plus text-amber-500"></i>
            補登過去月份
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            補登的收支會寫入該月的零用金歷史紀錄；動用淨額會扣除該月淨額，收支變動則會重算之後各月的上月結餘與淨額。
          </p>
        </div>

        <div class="space-y-1 md:w-52 shrink-0">
          <label for="backfill-month" class="text-xs font-semibold text-slate-600">補登月份</label>
          <DatePicker
            v-model="selectedModel"
            input-id="backfill-month"
            view="month"
            date-format="yy 年 mm 月"
            :max-date="lastMonth"
            show-icon
            icon-display="input"
            size="small"
            fluid
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div class="text-xs text-slate-500 font-medium mb-0.5">{{ month }} 月薪資配置淨額</div>
          <div
            v-if="salaryRecord"
            class="text-sm font-extrabold"
            :class="netAmountOf(salaryRecord) >= 0 ? 'text-emerald-600' : 'text-rose-600'"
          >
            {{ formatMoney(netAmountOf(salaryRecord)) }}
          </div>
          <div v-else class="text-sm font-bold text-slate-400">尚無紀錄</div>
        </div>

        <div class="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100/50">
          <div class="text-xs text-indigo-600 font-medium mb-0.5">{{ month }} 月剩餘零用金</div>
          <div class="text-sm font-extrabold text-indigo-700">{{ formatMoney(pocket.unspentAllowance(pocketRecord)) }}</div>
        </div>

        <div class="bg-amber-50/60 p-3 rounded-2xl border border-amber-100/50">
          <div class="text-xs text-amber-600 font-medium mb-0.5">帶入下月的上月結餘</div>
          <div class="text-sm font-extrabold text-amber-700">
            {{ salaryRecord ? formatMoney(pocket.previousBalanceFor(nextYear, nextMonth)) : '—' }}
          </div>
        </div>
      </div>

      <Message v-if="!salaryRecord" severity="warn" size="small" icon="pi pi-exclamation-triangle">
        {{ year }} 年 {{ month }} 月尚未儲存薪資配置，仍可補登零用金收支，但無法動用該月淨額。
      </Message>
    </div>

    <!-- 以月份為 key，切換月份時重置表單 -->
    <PocketMoneyCurrent :key="`${year}-${month}`" :year="year" :month="month" backfill />
  </div>
</template>
