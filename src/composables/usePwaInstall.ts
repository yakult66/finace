/**
 * PWA 安裝提示 (A2HS)。Service Worker 註冊與更新交給 vite-plugin-pwa，
 * 這裡只處理瀏覽器的 beforeinstallprompt 與 iOS 手動加入主畫面的教學。
 * 狀態放在模組層級，讓所有元件共用。
 */
import { computed, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstalled = ref(false)
const showIosGuide = ref(false)

const standaloneQuery = window.matchMedia('(display-mode: standalone)')
const detectStandalone = () =>
  standaloneQuery.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPadOS 13+ 的 UA 會偽裝成 Macintosh，改以觸控點數判斷 */
const isIos =
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

isInstalled.value = detectStandalone()

window.addEventListener('beforeinstallprompt', event => {
  // 攔截瀏覽器預設的安裝橫幅，改由 App 內的按鈕觸發
  event.preventDefault()
  deferredPrompt.value = event as BeforeInstallPromptEvent
})
window.addEventListener('appinstalled', () => {
  deferredPrompt.value = null
  isInstalled.value = true
})
standaloneQuery.addEventListener('change', e => {
  isInstalled.value = e.matches
})

export function usePwaInstall() {
  const canInstall = computed(() => deferredPrompt.value !== null && !isInstalled.value)
  const canShowIosGuide = computed(() => isIos && !isInstalled.value)
  const showInstallButton = computed(() => canInstall.value || canShowIosGuide.value)

  async function install() {
    if (!canInstall.value) {
      showIosGuide.value = canShowIosGuide.value
      return
    }
    const prompt = deferredPrompt.value!
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    // 提示只能使用一次，取消後需等瀏覽器再次派發事件
    deferredPrompt.value = null
    if (outcome === 'accepted') isInstalled.value = true
  }

  return { showInstallButton, showIosGuide, install }
}
