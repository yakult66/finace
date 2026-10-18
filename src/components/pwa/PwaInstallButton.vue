<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Avatar from 'primevue/avatar'
import { usePwaInstall } from '@/composables/usePwaInstall'

defineProps<{ collapsed?: boolean }>()

const { showInstallButton, showIosGuide, install } = usePwaInstall()
const iconUrl = `${import.meta.env.BASE_URL}pwa-192.png`

const steps = [
  { text: '點選 Safari 下方的分享按鈕', icon: 'pi pi-upload' },
  { text: '選擇「加入主畫面」' },
  { text: '按右上角「新增」完成安裝' }
]
</script>

<template>
  <Button
    v-if="showInstallButton"
    :label="collapsed ? undefined : '安裝應用程式'"
    icon="pi pi-download"
    severity="secondary"
    size="small"
    class="w-full"
    :title="collapsed ? '安裝應用程式' : undefined"
    @click="install"
  />

  <!-- iOS Safari 沒有安裝 API，改提供手動加入主畫面的教學 -->
  <Dialog v-model:visible="showIosGuide" modal :draggable="false" class="mx-4 w-full max-w-sm">
    <template #header>
      <div class="flex items-center gap-3">
        <Avatar :image="iconUrl" size="large" />
        <div>
          <p class="font-bold text-slate-800">安裝「客家人守財」</p>
          <p class="text-xs text-slate-400">加入主畫面即可全螢幕開啟</p>
        </div>
      </div>
    </template>

    <ol class="space-y-3 text-sm text-slate-600">
      <li v-for="(step, i) in steps" :key="i" class="flex items-center gap-3">
        <Avatar :label="String(i + 1)" shape="circle" size="small" class="bg-primary-50! text-primary-600!" />
        <span>
          {{ step.text }}
          <i v-if="step.icon" :class="step.icon" class="mx-1 text-primary"></i>
        </span>
      </li>
    </ol>

    <template #footer>
      <Button label="我知道了" class="w-full" @click="showIosGuide = false" />
    </template>
  </Dialog>
</template>
