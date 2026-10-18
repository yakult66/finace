<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import PlannedRecords from '@/features/planned/PlannedRecords.vue'
</script>

<template>
  <PageHeader title="預計費用紀錄" description="記錄預計的收入與支出並計算總計，獨立記錄、不影響其他功能。" />
  <PlannedRecords />
</template>
