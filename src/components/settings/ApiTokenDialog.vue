<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { apiToken, needsToken, setApiToken } from '@/services/http'
import { loadAllStores } from '@/stores'

const toast = useToast()
const draft = ref('')

watch(needsToken, open => {
  if (open) draft.value = apiToken.value
})

async function submit() {
  setApiToken(draft.value)
  await loadAllStores()
  if (!needsToken.value) {
    toast.add({ severity: 'success', summary: '已連線雲端資料庫', life: 2500 })
  }
}
</script>

<template>
  <Dialog
    v-model:visible="needsToken"
    modal
    header="雲端同步金鑰"
    :draggable="false"
    class="mx-4 w-full max-w-sm"
  >
    <div class="space-y-3">
      <Message severity="secondary" size="small" variant="simple">
        請輸入部署時設定的 API_TOKEN。未輸入時資料只會存在這台裝置。
      </Message>
      <Password
        v-model="draft"
        :feedback="false"
        toggle-mask
        fluid
        size="small"
        placeholder="API 金鑰"
        input-id="api-token"
        @keyup.enter="submit"
      />
    </div>
    <template #footer>
      <Button label="稍後再說" severity="secondary" text size="small" @click="needsToken = false" />
      <Button label="儲存並同步" icon="pi pi-cloud-upload" size="small" :disabled="!draft.trim()" @click="submit" />
    </template>
  </Dialog>
</template>
