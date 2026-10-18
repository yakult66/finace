<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ProgressBar from 'primevue/progressbar'
import { useEmergencyFundStore } from '@/stores'
import { formatMoney } from '@/composables/useFormat'
import EmergencyGoalCard from './components/EmergencyGoalCard.vue'

const store = useEmergencyFundStore()
const { goals, totalCurrentEmergencyFund, totalTargetEmergencyFund, overallProgress, activeMonthlyDepositTotal } =
  storeToRefs(store)

// 新增目標表單
const newGoalName = ref('')
const newGoalTarget = ref<number | null>(null)
const showAddGoal = ref(false)

const submitNewGoal = () => {
  const name = newGoalName.value.trim()
  if (!name) return
  store.addGoal(name, newGoalTarget.value || 0)
  newGoalName.value = ''
  newGoalTarget.value = null
  showAddGoal.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頂部總覽看板 -->
    <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div class="p-6 md:p-8">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="flex items-center text-lg font-bold text-slate-800">
            <i class="pi pi-shield mr-2 text-blue-500"></i>
            緊急備用金總覽
          </h2>
          <Button label="新增目標" icon="pi pi-plus" size="small" @click="showAddGoal = !showAddGoal" />
        </div>

        <!-- 統計卡片 -->
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div class="rounded-2xl border border-blue-100/50 bg-blue-50/60 p-4">
            <div class="mb-1 flex items-center gap-1 text-xs font-medium text-blue-400">
              <i class="pi pi-lock text-xs"></i> 累積總額
            </div>
            <div class="text-2xl font-bold text-blue-600">{{ formatMoney(totalCurrentEmergencyFund) }}</div>
          </div>
          <div class="rounded-2xl border border-slate-100/50 bg-slate-50 p-4">
            <div class="mb-1 text-xs font-medium text-slate-400">目標總額</div>
            <div class="text-2xl font-bold text-slate-700">{{ formatMoney(totalTargetEmergencyFund) }}</div>
          </div>
          <div class="rounded-2xl border border-emerald-100/50 bg-emerald-50/60 p-4">
            <div class="mb-1 text-xs font-medium text-emerald-400">總達成進度</div>
            <div class="text-2xl font-bold text-emerald-600">{{ overallProgress }}%</div>
            <ProgressBar
              :value="overallProgress"
              :show-value="false"
              class="mt-2 h-1.5! bg-emerald-100!"
              :pt="{ value: { class: 'bg-emerald-500!' } }"
            />
          </div>
          <div class="rounded-2xl border border-indigo-100/50 bg-indigo-50/60 p-4">
            <div class="mb-1 text-xs font-medium text-indigo-400">每月預計存入</div>
            <div class="text-2xl font-bold text-indigo-600">{{ formatMoney(activeMonthlyDepositTotal) }}</div>
          </div>
        </div>

        <!-- 新增目標表單 -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="showAddGoal" class="mt-6 rounded-2xl border border-blue-100/50 bg-blue-50/30 p-5">
            <h3 class="mb-4 text-sm font-bold text-slate-700">建立新的備用金目標</h3>
            <div class="flex flex-col items-end gap-3 sm:flex-row">
              <div class="w-full flex-1 space-y-1.5">
                <label for="new-goal-name" class="block text-xs font-medium text-slate-500">目標名稱</label>
                <InputText
                  id="new-goal-name"
                  v-model="newGoalName"
                  placeholder="例如：個人生活備用金"
                  size="small"
                  fluid
                  @keyup.enter="submitNewGoal"
                />
              </div>
              <div class="w-full flex-1 space-y-1.5">
                <label for="new-goal-target" class="block text-xs font-medium text-slate-500">目標金額</label>
                <InputNumber
                  v-model="newGoalTarget"
                  input-id="new-goal-target"
                  mode="decimal"
                  :min-fraction-digits="0"
                  :min="0"
                  prefix="$"
                  placeholder="0"
                  size="small"
                  fluid
                  @keydown.enter="submitNewGoal"
                />
              </div>
              <div class="flex w-full gap-2 sm:w-auto">
                <Button
                  label="建立"
                  icon="pi pi-plus"
                  size="small"
                  class="flex-1 sm:flex-none"
                  :disabled="!newGoalName.trim()"
                  @click="submitNewGoal"
                />
                <Button label="取消" severity="secondary" size="small" @click="showAddGoal = false" />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 目標卡片清單 -->
    <EmergencyGoalCard v-for="goal in goals" :key="goal.id" :goal="goal" />
  </div>
</template>
