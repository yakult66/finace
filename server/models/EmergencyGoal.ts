import mongoose, { Schema } from 'mongoose'
import type { EmergencyDepositPlan, EmergencyGoal } from '../../shared/types.js'
import { FundTransactionSchema } from './schemas.js'

const DepositPlanSchema = new Schema<EmergencyDepositPlan>(
  {
    id: { type: String, required: true },
    amount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    createdAt: Number
  },
  { _id: false }
)

const EmergencyGoalSchema = new Schema<EmergencyGoal>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, default: 0 },
    currentAmount: { type: Number, default: 0 },
    depositPlans: [DepositPlanSchema],
    transactions: [FundTransactionSchema],
    lastProcessedMonth: String
  },
  { timestamps: true }
)

export const EmergencyGoalModel =
  mongoose.models.EmergencyGoal ||
  mongoose.model<EmergencyGoal>('EmergencyGoal', EmergencyGoalSchema)
