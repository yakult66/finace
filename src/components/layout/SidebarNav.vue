<script setup lang="ts">
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { mainNav } from '@/router/navigation'
import { isOffline, needsToken } from '@/services/http'
import PwaInstallButton from '@/components/pwa/PwaInstallButton.vue'

defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const route = useRoute()
const isActive = (match: string) => route.path.startsWith(match)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <RouterLink v-for="item in mainNav" :key="item.match" v-slot="{ href, navigate }" :to="item.to" custom>
        <a
          v-ripple
          :href="href"
          :title="collapsed ? item.label : undefined"
          class="relative flex items-center gap-3 overflow-hidden rounded-xl whitespace-nowrap transition-colors"
          :class="[
            isActive(item.match)
              ? 'bg-primary-50 font-semibold text-primary-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
            collapsed ? 'justify-center p-3' : 'px-4 py-3'
          ]"
          @click="(e) => { navigate(e); emit('navigate') }"
        >
          <span
            v-if="isActive(item.match)"
            class="absolute inset-y-1/4 left-0 w-1 rounded-r-full bg-primary"
          ></span>
          <i :class="item.icon" class="shrink-0 text-lg"></i>
          <span v-if="!collapsed" class="text-sm tracking-wide">{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>

    <div class="shrink-0 space-y-2 px-3 pb-4">
      <div v-if="isOffline && !collapsed" class="px-1">
        <Tag severity="warn" icon="pi pi-cloud" value="離線模式：資料暫存於本機" class="w-full" />
      </div>
      <Button
        :label="collapsed ? undefined : '雲端同步金鑰'"
        icon="pi pi-key"
        severity="secondary"
        text
        size="small"
        class="w-full"
        :class="collapsed ? 'justify-center' : 'justify-start'"
        @click="needsToken = true"
      />
      <PwaInstallButton :collapsed="collapsed" />
    </div>
  </div>
</template>
