import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * 全站唯一的元件樣式設定來源。
 * 主色以 indigo-600 (#4f46e5) 為基準，元件尺寸用 token 調整，不在 CSS 覆寫。
 */
export const FinancePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.600}',
      600: '{indigo.700}',
      700: '{indigo.800}',
      800: '{indigo.900}',
      900: '{indigo.900}',
      950: '{indigo.950}'
    },
    formField: {
      borderRadius: '{border.radius.lg}'
    }
  },
  components: {
    button: {
      root: {
        borderRadius: '{border.radius.xl}'
      }
    },
    progressbar: {
      root: {
        height: '0.5rem',
        borderRadius: '9999px'
      }
    }
  }
})
