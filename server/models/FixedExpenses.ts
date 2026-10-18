import mongoose, { Schema } from 'mongoose'
import type { FixedExpense, FixedExpensesDoc, LargeExpense } from '../../shared/types.js'

const FixedExpenseSchema = new Schema<FixedExpense>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    linkedLargeExpenseId: String,
    createdAt: Number,
    updatedAt: Number
  },
  { _id: false }
)

const LargeExpenseSchema = new Schema<LargeExpense>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    totalAmount: { type: Number, default: 0 },
    accumulatedAmount: { type: Number, default: 0 },
    paymentMonth: String,
    isAveraged: { type: Boolean, default: true },
    lastProcessedMonth: String,
    createdAt: Number,
    updatedAt: Number
  },
  { _id: false }
)

const FixedExpensesSchema = new Schema<FixedExpensesDoc>(
  {
    monthly: [FixedExpenseSchema],
    annual: [LargeExpenseSchema]
  },
  // 舊版文件裡的 autoDeductSettings / paymentLogs 前端已不使用，保留原樣不刪除
  { timestamps: true, strict: false }
)

export const FixedExpensesModel =
  mongoose.models.FixedExpenses ||
  mongoose.model<FixedExpensesDoc>('FixedExpenses', FixedExpensesSchema)
