<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import type { TabItem } from '@/router/navigation'

const tabs: TabItem[] = [
  { label: '薪資分配', icon: 'pi pi-wallet', name: 'salary-allocation' },
  { label: '固定支出項目', icon: 'pi pi-receipt', name: 'fixed-expenses' },
  { label: '歷史紀錄', icon: 'pi pi-history', name: 'salary-history' }
]
</script>

<template>
  <PageHeader title="當月薪資配置與歷史紀錄" description="管理您每個月的薪資收入與各項花費配置。" :tabs="tabs" />
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
