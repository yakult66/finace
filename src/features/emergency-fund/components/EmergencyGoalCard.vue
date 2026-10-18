<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import type { EmergencyDepositPlan, EmergencyGoal, FundTransaction } from '@shared/types'
import { useEmergencyFundStore } from '@/stores'
import { formatMoney, formatSignedMoney, todayString } from '@/composables/useFormat'

const props = defineProps<{ goal: EmergencyGoal }>()

const store = useEmergencyFundStore()
const confirm = useConfirm()

type TxType = FundTransaction['type']

const progress = computed(() => {
  if (props.goal.targetAmount <= 0) return 0
  return Math.min(100, Math.round((props.goal.currentAmount / props.goal.targetAmount) * 100))
})

const isCompleted = computed(() => props.goal.targetAmount > 0 && props.goal.currentAmount >= props.goal.targetAmount)

// 名稱與目標金額：編輯中先存草稿，失焦時才寫入 store
const nameDraft = ref<string | null>(null)
const targetDraft = ref<number | null | undefined>(undefined)

const commitName = () => {
  if (nameDraft.value === null) return
  const name = nameDraft.value.trim()
  if (name && name !== props.goal.name) store.updateGoal(props.goal.id, { name })
  nameDraft.value = null
}

const commitTarget = () => {
  if (targetDraft.value === undefined) return
  const targetAmount = targetDraft.value ?? 0
  if (targetAmount !== props.goal.targetAmount) store.updateGoal(props.goal.id, { targetAmount })
  targetDraft.value = undefined
}

const confirmDeleteGoal = () => {
  const { goal } = props
  confirm.require({
    header: '刪除目標',
    message:
      goal.currentAmount > 0
        ? `目標「${goal.name}」目前累積金額 ${formatMoney(goal.currentAmount)}，確定要刪除嗎？`
        : `確定要刪除目標「${goal.name}」嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => store.deleteGoal(goal.id)
  })
}

// 未鎖定的存入設定金額草稿，離開欄位時寫入，儲存時再鎖定
const planDrafts = ref<Record<string, number | null>>({})

const planAmount = (plan: EmergencyDepositPlan) => planDrafts.value[plan.id] ?? plan.amount

const commitPlanAmount = (plan: EmergencyDepositPlan) => {
  const amount = planDrafts.value[plan.id]
  if (amount === undefined) return
  delete planDrafts.value[plan.id]
  return store.updateDepositPlan(props.goal.id, plan.id, amount ?? 0)
}

const savePlan = async (plan: EmergencyDepositPlan) => {
  const amount = planAmount(plan)
  if (!amount || amount <= 0) return
  await commitPlanAmount(plan)
  store.saveAndLockDepositPlan(props.goal.id, plan.id)
}

const confirmDeletePlan = (plan: EmergencyDepositPlan) => {
  confirm.require({
    header: '刪除存入設定',
    message: `確定要刪除每月存入 ${formatMoney(plan.amount)} 這項設定嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => {
      delete planDrafts.value[plan.id]
      store.deleteDepositPlan(props.goal.id, plan.id)
    }
  })
}

// 新增存入項目：null 表示表單收合
const newPlanAmount = ref<number | null>(null)
const showNewPlan = ref(false)

const openNewPlan = () => {
  newPlanAmount.value = null
  showNewPlan.value = true
}

const submitNewPlan = () => {
  const amount = newPlanAmount.value
  if (!amount || amount <= 0) return
  store.addDepositPlan(props.goal.id, amount)
  newPlanAmount.value = null
  showNewPlan.value = false
}

// 臨時存入 / 支出表單
const txTypeOptions: { label: string; value: TxType; icon: string }[] = [
  { label: '臨時存入', value: 'deposit', icon: 'pi pi-plus-circle' },
  { label: '臨時支出', value: 'expense', icon: 'pi pi-minus-circle' }
]
const txType = ref<TxType>('deposit')
const txName = ref('')
const txAmount = ref<number | null>(null)

const canSubmitTx = computed(() => !!txName.value.trim() && !!txAmount.value && txAmount.value > 0)

const submitTransaction = () => {
  if (!canSubmitTx.value || !txAmount.value) return
  store.addTransaction(props.goal.id, {
    type: txType.value,
    name: txName.value.trim(),
    amount: txAmount.value,
    date: todayString()
  })
  txName.value = ''
  txAmount.value = null
  txType.value = 'deposit'
}

// 異動歷史（最新 10 筆）
const showHistory = ref(false)
const recentTransactions = computed(() => [...props.goal.transactions].reverse().slice(0, 10))

const ids = computed(() => ({
  name: `goal-name-${props.goal.id}`,
  target: `goal-target-${props.goal.id}`,
  newPlan: `goal-new-plan-${props.goal.id}`,
  txName: `goal-tx-name-${props.goal.id}`,
  txAmount: `goal-tx-amount-${props.goal.id}`
}))
</script>

<template>
  <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
    <div class="p-6 md:p-8">
      <!-- 卡片頭部 -->
      <div class="mb-2 flex items-start justify-between">
        <div class="min-w-0 flex-1">
          <div class="mb-2 flex items-center gap-3">
            <label :for="ids.name" class="sr-only">目標名稱</label>
            <InputText
              :id="ids.name"
              :model-value="nameDraft ?? goal.name"
              size="small"
              class="w-full max-w-xs font-bold text-slate-800"
              @update:model-value="(v) => (nameDraft = v ?? '')"
              @blur="commitName"
              @keyup.enter="commitName"
            />
            <Tag v-if="isCompleted" severity="success" rounded icon="pi pi-check-circle" value="已達標 🎉" class="whitespace-nowrap" />
          </div>

          <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <!-- 目標金額 (可輸入) -->
            <div>
              <label :for="ids.target" class="mb-1 block text-xs text-slate-400">目標金額</label>
              <InputNumber
                :input-id="ids.target"
                :model-value="targetDraft === undefined ? goal.targetAmount : targetDraft"
                mode="decimal"
                :min-fraction-digits="0"
                :min="0"
                prefix="$"
                size="small"
                fluid
                input-class="text-right font-bold"
                @update:model-value="(v: number | null) => (targetDraft = v)"
                @blur="commitTarget"
                @keydown.enter="commitTarget"
              />
            </div>
            <!-- 累積金額 (唯讀) -->
            <div>
              <div class="mb-1 flex items-center gap-1 text-xs text-slate-400">
                <i class="pi pi-lock text-xs"></i> 已累積
              </div>
              <div class="text-lg font-bold text-blue-600">{{ formatMoney(goal.currentAmount) }}</div>
            </div>
            <!-- 進度 -->
            <div>
              <div class="mb-1 text-xs text-slate-400">達成進度</div>
              <div class="text-lg font-bold" :class="isCompleted ? 'text-emerald-500' : 'text-slate-700'">{{ progress }}%</div>
              <ProgressBar
                :value="progress"
                :show-value="false"
                class="mt-1 h-1.5! bg-slate-100!"
                :pt="{ value: { class: isCompleted ? 'bg-emerald-500!' : 'bg-blue-500!' } }"
              />
            </div>
          </div>
        </div>

        <!-- 刪除目標 -->
        <Button
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          size="small"
          class="ml-4 shrink-0"
          aria-label="刪除目標"
          title="刪除目標"
          @click="confirmDeleteGoal"
        />
      </div>

      <Divider />

      <!-- 每月預設存入設定區塊 -->
      <div class="mb-2">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <i class="pi pi-sync text-xs text-blue-400"></i>
            每月預設存入設定
          </h3>
          <span class="text-xs text-slate-400">僅可啟用一項</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="plan in goal.depositPlans"
            :key="plan.id"
            class="flex items-center gap-3 rounded-xl border p-3 transition-colors"
            :class="plan.isActive ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'"
          >
            <!-- 金額 -->
            <div class="max-w-48 flex-1">
              <InputNumber
                v-if="!plan.isLocked"
                :input-id="`plan-amount-${plan.id}`"
                :model-value="planAmount(plan)"
                mode="decimal"
                :min-fraction-digits="0"
                :min="0"
                prefix="$"
                placeholder="輸入金額"
                size="small"
                fluid
                input-class="text-right"
                aria-label="每月存入金額"
                @update:model-value="(v: number | null) => (planDrafts[plan.id] = v)"
                @blur="commitPlanAmount(plan)"
              />
              <div
                v-else
                class="flex w-full cursor-not-allowed items-center justify-end gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600"
              >
                {{ formatMoney(plan.amount) }}
                <i class="pi pi-lock text-xs text-slate-400"></i>
              </div>
            </div>

            <!-- 儲存按鈕 (未鎖定時顯示) -->
            <Button
              v-if="!plan.isLocked"
              label="儲存"
              icon="pi pi-save"
              severity="success"
              size="small"
              :disabled="!planAmount(plan) || planAmount(plan) <= 0"
              @click="savePlan(plan)"
            />

            <!-- 啟用/停用 Switch -->
            <span class="flex shrink-0" :title="!plan.isLocked ? '請先儲存金額再啟用' : plan.isActive ? '停用' : '啟用'">
              <ToggleSwitch
                :model-value="plan.isActive"
                :disabled="!plan.isLocked"
                aria-label="啟用此存入設定"
                @update:model-value="(v: boolean) => store.toggleDepositPlanActive(goal.id, plan.id, v)"
              />
            </span>

            <!-- 刪除 -->
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              class="shrink-0"
              aria-label="刪除此設定"
              title="刪除此設定"
              @click="confirmDeletePlan(plan)"
            />
          </div>

          <div v-if="goal.depositPlans.length === 0" class="py-4 text-center text-sm text-slate-400">
            尚未設定每月存入金額
          </div>
        </div>

        <!-- 新增存入項目 -->
        <Button
          v-if="!showNewPlan"
          label="新增存入項目"
          icon="pi pi-plus"
          severity="secondary"
          outlined
          size="small"
          class="mt-3 w-full border-dashed!"
          @click="openNewPlan"
        />
        <div v-else class="mt-3 flex items-center gap-2">
          <label :for="ids.newPlan" class="sr-only">每月存入金額</label>
          <div class="max-w-52 flex-1">
            <InputNumber
              v-model="newPlanAmount"
              :input-id="ids.newPlan"
              mode="decimal"
              :min-fraction-digits="0"
              :min="0"
              prefix="$"
              placeholder="每月存入金額"
              size="small"
              fluid
              @keydown.enter="submitNewPlan"
            />
          </div>
          <Button label="新增" size="small" :disabled="!newPlanAmount" @click="submitNewPlan" />
          <Button label="取消" severity="secondary" size="small" @click="showNewPlan = false" />
        </div>
      </div>

      <Divider />

      <!-- 臨時新增 / 臨時支出區塊 -->
      <div>
        <h3 class="mb-4 flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <i class="pi pi-bolt text-xs text-amber-400"></i>
          臨時存入 / 支出
        </h3>

        <div class="space-y-3 rounded-2xl border border-slate-100/50 bg-slate-50/50 p-4">
          <!-- 類型切換 -->
          <SelectButton
            v-model="txType"
            :options="txTypeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            size="small"
            aria-label="異動類型"
          >
            <template #option="{ option }">
              <i
                :class="[option.icon, option.value === 'deposit' ? 'text-emerald-500' : 'text-rose-500']"
                class="text-xs"
              ></i>
              <span>{{ option.label }}</span>
            </template>
          </SelectButton>

          <div class="flex flex-col items-end gap-3 sm:flex-row">
            <div class="w-full flex-1 space-y-1">
              <label :for="ids.txName" class="block text-xs text-slate-400">項目名稱</label>
              <InputText
                :id="ids.txName"
                v-model="txName"
                :placeholder="txType === 'deposit' ? '例如：年終獎金存入' : '例如：緊急維修'"
                size="small"
                fluid
                @keyup.enter="submitTransaction"
              />
            </div>
            <div class="w-full space-y-1 sm:w-36">
              <label :for="ids.txAmount" class="block text-xs text-slate-400">金額</label>
              <InputNumber
                v-model="txAmount"
                :input-id="ids.txAmount"
                mode="decimal"
                :min-fraction-digits="0"
                :min="0"
                prefix="$"
                placeholder="0"
                size="small"
                fluid
                input-class="text-right"
                @keydown.enter="submitTransaction"
              />
            </div>
            <Button
              :label="txType === 'deposit' ? '存入' : '支出'"
              :severity="txType === 'deposit' ? 'success' : 'danger'"
              size="small"
              class="w-full whitespace-nowrap sm:w-auto"
              :disabled="!canSubmitTx"
              @click="submitTransaction"
            />
          </div>
        </div>

        <!-- 異動歷史 -->
        <div v-if="goal.transactions.length > 0" class="mt-3">
          <Button
            :label="`近期異動紀錄 (${goal.transactions.length})`"
            :icon="showHistory ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            severity="secondary"
            text
            size="small"
            class="text-xs!"
            @click="showHistory = !showHistory"
          />
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div v-if="showHistory" class="mt-2 max-h-96 space-y-1.5 overflow-y-auto">
              <div
                v-for="tx in recentTransactions"
                :key="tx.id"
                class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <div class="flex items-center gap-2">
                  <i
                    class="text-xs"
                    :class="tx.type === 'deposit' ? 'pi pi-arrow-down text-emerald-500' : 'pi pi-arrow-up text-rose-500'"
                  ></i>
                  <span class="text-slate-600">{{ tx.name }}</span>
                  <span class="text-xs text-slate-400">{{ tx.date }}</span>
                </div>
                <span class="font-medium" :class="tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-500'">
                  {{ formatSignedMoney(tx.amount, tx.type === 'deposit' ? '+' : '-') }}
                </span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>
