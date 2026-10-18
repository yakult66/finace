<script setup lang="ts">
import { useRoute } from 'vue-router'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import type { TabItem } from '@/router/navigation'

defineProps<{
  title: string
  description?: string
  tabs?: TabItem[]
}>()

const route = useRoute()
</script>

<template>
  <div class="mb-6 sm:mb-8">
    <h1 class="text-xl font-bold text-slate-800 sm:text-2xl">{{ title }}</h1>
    <p v-if="description" class="mt-1 text-xs text-slate-500 sm:text-sm">{{ description }}</p>

    <Tabs v-if="tabs?.length" :value="String(route.name)" class="mt-4 sm:mt-6">
      <TabList>
        <Tab v-for="tab in tabs" :key="tab.name" :value="tab.name" class="p-0!">
          <RouterLink v-slot="{ href, navigate }" :to="{ name: tab.name }" custom>
            <a v-ripple :href="href" class="flex items-center gap-2 px-4 py-3 text-sm text-inherit" @click="navigate">
              <i :class="tab.icon" class="text-xs"></i>
              <span>{{ tab.label }}</span>
            </a>
          </RouterLink>
        </Tab>
      </TabList>
    </Tabs>
  </div>
</template>
