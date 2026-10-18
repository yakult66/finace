import express from 'express'
import { isDbConnected } from './db.js'
import { ensureDb, errorHandler, requireToken } from './middleware.js'
import { collectionRouter, singletonRouter } from './routes.js'
import { SalaryAllocationModel } from './models/SalaryAllocation.js'
import { FixedExpensesModel } from './models/FixedExpenses.js'
import { EmergencyGoalModel } from './models/EmergencyGoal.js'
import { PocketMoneyModel } from './models/PocketMoney.js'
import { EntertainmentFundModel, InvestmentPlanModel } from './models/FundPlan.js'

export const app = express()

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', ensureDb, (_req, res) => {
  res.json({ status: 'ok', database: isDbConnected() ? 'Connected' : 'Disconnected' })
})

const api = express.Router()
api.use(requireToken, ensureDb)

api.use('/salary-allocations', collectionRouter(SalaryAllocationModel))
api.use('/emergency-goals', collectionRouter(EmergencyGoalModel))
api.use('/pocket-money', collectionRouter(PocketMoneyModel))
api.use('/fixed-expenses', singletonRouter(FixedExpensesModel, { monthly: [], annual: [] }))
api.use(
  '/investment-plan',
  singletonRouter(InvestmentPlanModel, { id: 'default_investment_plan', targetAmount: 0, transactions: [] })
)
api.use(
  '/entertainment-fund',
  singletonRouter(EntertainmentFundModel, { id: 'default_entertainment_fund', targetAmount: 0, transactions: [] })
)

app.use('/api', api)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})
app.use(errorHandler)

export default app
