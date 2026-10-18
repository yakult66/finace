import mongoose, { Schema } from 'mongoose'
import { POCKET_CATEGORIES } from '../../shared/types.js'
import type { PocketMoneyMonthRecord, PocketMoneyTransaction } from '../../shared/types.js'

const PocketMoneyTransactionSchema = new Schema<PocketMoneyTransaction>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense', 'netDraw'], required: true },
    category: { type: String, enum: POCKET_CATEGORIES, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() }
  },
  { _id: false }
)

const PocketMoneySchema = new Schema<PocketMoneyMonthRecord>(
  {
    id: { type: String, required: true, unique: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    allocatedAllowance: { type: Number, default: 0 },
    transactions: [PocketMoneyTransactionSchema]
  },
  { timestamps: true }
)

export const PocketMoneyModel =
  mongoose.models.PocketMoney ||
  mongoose.model<PocketMoneyMonthRecord>('PocketMoney', PocketMoneySchema)
