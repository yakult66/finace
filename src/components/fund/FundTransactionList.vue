<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import type { FundTransaction } from '@shared/types'
import { formatSignedMoney } from '@/composables/useFormat'
import { ACCENT_ICON_CLASS, type FundAccent } from './accent'

const props = defineProps<{
  title: string
  emptyText: string
  transactions: FundTransaction[]
  accent: FundAccent
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const confirm = useConfirm()
const accentIcon = computed(() => ACCENT_ICON_CLASS[props.accent])

function requestDelete(tx: FundTransaction) {
  confirm.require({
    header: '刪除確認',
    message: `確定要刪除「${tx.name}」這筆紀錄嗎？`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: '取消', severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: '刪除', severity: 'danger', size: 'small' },
    accept: () => emit('delete', tx.id)
  })
}
</script>

<template>
  <div class="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
    <div class="flex items-center justify-between border-b border-slate-100 p-6">
      <h2 class="flex items-center gap-2 text-base font-bold text-slate-800">
        <i class="pi pi-list" :class="accentIcon"></i>
        {{ title }} (共 {{ transactions.length }} 筆)
      </h2>
    </div>

    <div v-if="transactions.length === 0" class="p-8 text-center text-sm text-slate-400">
      {{ emptyText }}
    </div>

    <ul v-else class="divide-y divide-slate-100">
      <li
        v-for="tx in transactions"
        :key="tx.id"
        class="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50"
      >
        <div class="flex min-w-0 items-center gap-3">
          <Tag
            :value="tx.type === 'deposit' ? '增' : '支'"
            :severity="tx.type === 'deposit' ? 'success' : 'danger'"
            rounded
            class="size-8 shrink-0 text-xs"
          />
          <div class="min-w-0">
            <div class="truncate text-sm font-bold text-slate-800">{{ tx.name }}</div>
            <div class="mt-0.5 text-xs text-slate-400">{{ tx.date }}</div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-4">
          <span
            class="text-base font-extrabold"
            :class="tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'"
          >
            {{ formatSignedMoney(tx.amount, tx.type === 'deposit' ? '+' : '-') }}
          </span>
          <Button
            icon="pi pi-trash"
            severity="secondary"
            text
            rounded
            size="small"
            aria-label="刪除"
            class="text-slate-300 hover:text-rose-500"
            @click="requestDelete(tx)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
