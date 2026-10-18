<script setup lang="ts">
defineProps<{
  label: string
  icon: string
  /** 已格式化的顯示數值（使用 default slot 時可省略） */
  value?: string
  /** 標題列文字顏色 */
  labelClass?: string
  /** 數值文字樣式 */
  valueClass?: string
}>()
</script>

<template>
  <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div
      class="mb-1 flex items-center justify-between gap-2 text-xs font-semibold"
      :class="labelClass ?? 'text-slate-400'"
    >
      <span class="flex items-center gap-1"><i :class="icon"></i> {{ label }}</span>
      <slot name="action" />
    </div>
    <slot>
      <div class="text-2xl" :class="valueClass ?? 'font-bold text-slate-800'">{{ value }}</div>
    </slot>
  </div>
</template>
