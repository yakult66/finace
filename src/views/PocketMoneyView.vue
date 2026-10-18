<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import type { TabItem } from '@/router/navigation'

const tabs: TabItem[] = [
  { label: '當月收支明細', icon: 'pi pi-sparkles', name: 'pocket-money' },
  { label: '補登過去月份', icon: 'pi pi-calendar-plus', name: 'pocket-money-backfill' },
  { label: '每月歷史紀錄', icon: 'pi pi-history', name: 'pocket-money-history' }
]
</script>

<template>
  <PageHeader title="零用金收支管理" description="追蹤每月零用金收支明細、花費分類佔比與歷史檢視。" :tabs="tabs" />
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
