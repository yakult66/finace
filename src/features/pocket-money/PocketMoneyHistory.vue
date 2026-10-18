<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { usePocketMoneyStore } from '@/stores'
import { formatMoney, formatSignedMoney } from '@/composables/useFormat'
import type { PocketMoneyMonthRecord, PocketMoneyTransaction } from '@shared/types'

const store = usePocketMoneyStore()

const txTag: Record<PocketMoneyTransaction['type'], { label: string; severity: string }> = {
  expense: { label: '支出', severity: 'danger' },
  income: { label: '收入', severity: 'success' },
  netDraw: { label: '動用本月淨額', severity: 'info' }
}
// 依月份降冪排序 (新月份在前)
const { sortedRecords } = storeToRefs(store)

const recordKey = (record: PocketMoneyMonthRecord) => record.id || `${record.year}-${record.month}`

// 展開明細狀態
const expandedRecords = ref<Record<string, boolean>>({})

const toggleExpand = (record: PocketMoneyMonthRecord) => {
  const key = recordKey(record)
  expandedRecords.value[key] = !expandedRecords.value[key]
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頂部說明 -->
    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i class="pi pi-history text-indigo-500"></i>
          零用金歷史紀錄 (唯讀檢視)
        </h2>
        <p class="text-xs text-slate-500 mt-1">檢視過往各月份零用金額度、實際收支明細與花費類別佔比 (不可編輯)。</p>
      </div>
      <div class="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-center">
        <div class="text-xs text-slate-400 font-medium">紀錄月數</div>
        <div class="text-lg font-bold text-indigo-600">{{ sortedRecords.length }} 個月</div>
      </div>
    </div>

    <!-- 無紀錄提示 -->
    <div v-if="sortedRecords.length === 0" class="bg-white rounded-3xl border border-slate-100 p-12 text-center">
      <div class="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <i class="pi pi-inbox"></i>
      </div>
      <h3 class="text-base font-bold text-slate-700">尚無零用金歷史紀錄</h3>
      <p class="text-xs text-slate-400 mt-1">在當月新增零用金收支項目後，紀錄即會顯示於此。</p>
    </div>

    <!-- 歷史紀錄列表 (不可編輯) -->
    <div v-else class="space-y-4">
      <div
        v-for="record in sortedRecords"
        :key="recordKey(record)"
        class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="bg-indigo-50 text-indigo-600 font-bold px-3.5 py-1.5 rounded-xl text-sm">
            {{ record.year }} 年 {{ record.month }} 月
          </div>

          <div class="text-xs text-slate-400 font-medium">
            唯讀紀錄
          </div>
        </div>

        <!-- 數據統計區 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
          <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div class="text-xs text-slate-500 font-medium mb-0.5">薪資帶入零用金</div>
            <div class="text-sm font-bold text-slate-800">{{ formatMoney(store.allocatedFor(record)) }}</div>
            <div v-if="store.netDrawOf(record) > 0" class="text-xs text-indigo-500 font-medium mt-0.5">
              + 動用淨額 {{ formatMoney(store.netDrawOf(record)) }}
            </div>
          </div>

          <div class="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100/50">
            <div class="text-xs text-emerald-600 font-medium mb-0.5">總收入</div>
            <div class="text-sm font-bold text-emerald-700">
              {{ formatSignedMoney(store.categoryStatistics(record.transactions).totalIncome, '+') }}
            </div>
          </div>

          <div class="bg-rose-50/60 p-3 rounded-2xl border border-rose-100/50">
            <div class="text-xs text-rose-600 font-medium mb-0.5">總支出</div>
            <div class="text-sm font-bold text-rose-700">
              {{ formatSignedMoney(store.categoryStatistics(record.transactions).totalExpense, '-') }}
            </div>
          </div>

          <div class="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100/50">
            <div class="text-xs text-indigo-600 font-medium mb-0.5">未花完剩餘零用金</div>
            <div
              class="text-sm font-extrabold"
              :class="store.unspentAllowance(record) >= 0 ? 'text-indigo-700' : 'text-rose-600'"
            >
              {{ formatMoney(store.unspentAllowance(record)) }}
            </div>
          </div>
        </div>

        <!-- 各類別花費與佔比區 -->
        <div class="mt-4 pt-3 border-t border-slate-100">
          <div class="text-xs font-bold text-slate-700 mb-2">類別花費與佔比統計：</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <div
              v-for="stat in store.categoryStatistics(record.transactions).stats"
              :key="stat.category"
              class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs"
            >
              <div class="flex items-center justify-between text-slate-500 font-medium text-xs">
                <span>{{ stat.category }}</span>
                <span>{{ stat.percentage }}%</span>
              </div>
              <div class="text-slate-800 font-bold mt-1">
                {{ formatMoney(stat.amount) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 收支明細展開/收起 -->
        <div v-if="record.transactions.length > 0" class="mt-4 pt-3 border-t border-slate-100">
          <Button
            :label="expandedRecords[recordKey(record)] ? '收起收支明細' : `檢視當月收支明細 (${record.transactions.length} 筆)`"
            :icon="expandedRecords[recordKey(record)] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
            text
            size="small"
            class="text-xs! px-1!"
            @click="toggleExpand(record)"
          />

          <div v-if="expandedRecords[recordKey(record)]" class="mt-3 space-y-2 bg-slate-50 p-3 rounded-2xl">
            <div
              v-for="tx in record.transactions"
              :key="tx.id"
              class="bg-white p-3 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs"
            >
              <div class="flex items-center gap-2">
                <Tag :value="txTag[tx.type].label" :severity="txTag[tx.type].severity" class="text-xs" />
                <span class="font-bold text-slate-800">{{ tx.name }}</span>
                <Tag v-if="tx.type !== 'netDraw'" :value="tx.category" severity="secondary" class="text-xs" />
              </div>

              <div class="flex items-center gap-3">
                <span class="text-slate-400 text-xs">{{ tx.date }}</span>
                <span
                  class="font-extrabold"
                  :class="{ expense: 'text-rose-600', income: 'text-emerald-600', netDraw: 'text-indigo-600' }[tx.type]"
                >
                  {{ formatSignedMoney(tx.amount, tx.type === 'expense' ? '-' : '+') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
