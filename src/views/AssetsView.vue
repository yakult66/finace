<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import type { TabItem } from '@/router/navigation'

const tabs: TabItem[] = [
  { label: '投資規劃', icon: 'pi pi-chart-line', name: 'investment' },
  { label: '娛樂基金', icon: 'pi pi-gift', name: 'entertainment' },
  { label: '緊急備用金', icon: 'pi pi-shield', name: 'emergency' }
]
</script>

<template>
  <PageHeader title="資產配置" description="管理投資規劃、娛樂基金與緊急備用金之資產累積。" :tabs="tabs" />
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
