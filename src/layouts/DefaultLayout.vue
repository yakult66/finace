<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import SidebarNav from '@/components/layout/SidebarNav.vue'

const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
    <!-- 桌面版側邊欄 -->
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-100 bg-white shadow-sm transition-all duration-300 md:flex"
      :class="collapsed ? 'w-20' : 'w-64'"
    >
      <div class="flex h-16 shrink-0 items-center justify-between border-b border-slate-50 px-4">
        <span v-if="!collapsed" class="text-lg font-bold whitespace-nowrap text-slate-800">客家人守財</span>
        <Button
          :icon="collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
          severity="secondary"
          text
          rounded
          size="small"
          :aria-label="collapsed ? '展開選單' : '收合選單'"
          @click="collapsed = !collapsed"
        />
      </div>
      <SidebarNav :collapsed="collapsed" />
    </aside>

    <!-- 手機版側邊欄 -->
    <Drawer v-model:visible="mobileOpen" header="客家人守財" class="w-64!">
      <SidebarNav @navigate="mobileOpen = false" />
    </Drawer>

    <div class="flex min-w-0 flex-1 flex-col transition-all duration-300" :class="collapsed ? 'md:ml-20' : 'md:ml-64'">
      <!-- 手機版頂部列 -->
      <header
        class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 bg-white/80 px-4 backdrop-blur-xl md:hidden"
      >
        <Button icon="pi pi-bars" severity="secondary" text rounded aria-label="開啟選單" @click="mobileOpen = true" />
        <span class="text-lg font-bold text-slate-800">{{ route.matched[0]?.meta.title ?? '客家人守財' }}</span>
      </header>

      <main class="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
