import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 頁面標題（手機版頂部列、瀏覽器分頁） */
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'salary-allocation' } },
  {
    path: '/salary',
    component: () => import('@/views/SalaryView.vue'),
    meta: { title: '當月薪資配置' },
    children: [
      {
        path: '',
        name: 'salary-allocation',
        component: () => import('@/features/salary-allocation/SalaryAllocationForm.vue')
      },
      {
        path: 'fixed-expenses',
        name: 'fixed-expenses',
        component: () => import('@/features/fixed-expenses/FixedExpensesManager.vue')
      },
      {
        path: 'history',
        name: 'salary-history',
        component: () => import('@/features/salary-history/SalaryHistory.vue')
      }
    ]
  },
  {
    path: '/assets',
    component: () => import('@/views/AssetsView.vue'),
    meta: { title: '資產配置' },
    redirect: { name: 'investment' },
    children: [
      {
        path: 'investment',
        name: 'investment',
        component: () => import('@/features/investment/InvestmentOverview.vue')
      },
      {
        path: 'entertainment',
        name: 'entertainment',
        component: () => import('@/features/entertainment-fund/EntertainmentFundManager.vue')
      },
      {
        path: 'emergency',
        name: 'emergency',
        component: () => import('@/features/emergency-fund/EmergencyFundManager.vue')
      }
    ]
  },
  {
    path: '/pocket-money',
    component: () => import('@/views/PocketMoneyView.vue'),
    meta: { title: '零用金' },
    children: [
      {
        path: '',
        name: 'pocket-money',
        component: () => import('@/features/pocket-money/PocketMoneyCurrent.vue')
      },
      {
        path: 'backfill',
        name: 'pocket-money-backfill',
        component: () => import('@/features/pocket-money/PocketMoneyBackfill.vue')
      },
      {
        path: 'history',
        name: 'pocket-money-history',
        component: () => import('@/features/pocket-money/PocketMoneyHistory.vue')
      }
    ]
  },
  {
    path: '/planned',
    name: 'planned',
    component: () => import('@/views/PlannedView.vue'),
    meta: { title: '預計費用' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.afterEach(to => {
  document.title = to.meta.title ? `${to.meta.title}｜客家人守財` : '客家人守財'
})

export default router
