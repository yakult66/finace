<script setup lang="ts">
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ApiTokenDialog from '@/components/settings/ApiTokenDialog.vue'
import PwaUpdateToast from '@/components/pwa/PwaUpdateToast.vue'
</script>

<template>
  <DefaultLayout>
    <RouterView />
  </DefaultLayout>

  <Toast position="top-center" />
  <ConfirmDialog />
  <ApiTokenDialog />
  <PwaUpdateToast />
</template>
