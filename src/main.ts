import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Ripple from 'primevue/ripple'

import App from './App.vue'
import router from './router'
import { FinancePreset } from './theme/preset'
import { loadAllStores } from './stores'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: FinancePreset,
    options: {
      darkModeSelector: false,
      // 讓 Tailwind utilities 排在 PrimeVue 之後，可直接覆蓋元件樣式
      cssLayer: { name: 'primevue', order: 'theme, base, primevue' }
    }
  }
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('ripple', Ripple)

app.mount('#app')

loadAllStores()
