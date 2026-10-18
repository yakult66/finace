import mongoose, { Schema } from 'mongoose'
import type { SalaryAllocation } from '../../shared/types.js'

const SalaryAllocationSchema = new Schema<SalaryAllocation>(
  {
    id: { type: String, required: true, unique: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    payday: { type: String, required: true },
    income: { type: Number, default: 0 },
    investment: { type: Number, default: 0 },
    consumerFund: { type: Number, default: 0 },
    allowance: { type: Number, default: 0 },
    fixedExpenses: { type: Number, default: 0 },
    emergencyFund: { type: Number, default: 0 },
    previousBalance: { type: Number, default: 0 },
    netDraw: { type: Number, default: 0 },
    fixedExpensesSnapshot: [
      new Schema(
        { id: String, name: String, amount: Number, linkedLargeExpenseId: String, sourceId: String, locked: Boolean },
        { _id: false }
      )
    ]
  },
  { timestamps: true }
)

export const SalaryAllocationModel =
  mongoose.models.SalaryAllocation ||
  mongoose.model<SalaryAllocation>('SalaryAllocation', SalaryAllocationSchema)
