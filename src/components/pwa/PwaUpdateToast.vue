<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import Message from 'primevue/message'
import Button from 'primevue/button'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_url, registration) {
    // 長時間開著的分頁也能定期檢查新版本
    if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
  }
})
</script>

<template>
  <!-- 偵測到新版本時提示重新載入，避免停留在舊的快取版本 -->
  <div v-if="needRefresh" class="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:w-80">
    <Message severity="info" icon="pi pi-sync" closable class="shadow-lg" @close="needRefresh = false">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">有新版本可用</p>
          <p class="text-xs">重新載入即可取得最新功能</p>
        </div>
        <Button label="更新" size="small" @click="updateServiceWorker()" />
      </div>
    </Message>
  </div>
</template>
