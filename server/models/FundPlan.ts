import mongoose, { Schema } from 'mongoose'
import type { FundPlan } from '../../shared/types.js'
import { FundTransactionSchema } from './schemas.js'

/** 投資規劃與娛樂基金結構相同，各自存在獨立的 collection */
function createFundPlanSchema() {
  return new Schema<FundPlan>(
    {
      id: { type: String, required: true, unique: true },
      targetAmount: { type: Number, default: 0 },
      transactions: [FundTransactionSchema]
    },
    { timestamps: true }
  )
}

export const InvestmentPlanModel =
  mongoose.models.InvestmentPlan ||
  mongoose.model<FundPlan>('InvestmentPlan', createFundPlanSchema())

export const EntertainmentFundModel =
  mongoose.models.EntertainmentFund ||
  mongoose.model<FundPlan>('EntertainmentFund', createFundPlanSchema())
