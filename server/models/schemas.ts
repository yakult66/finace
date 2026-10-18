import { Schema } from 'mongoose'
import type { FundTransaction } from '../../shared/types.js'

/** 基金類異動紀錄的子文件 schema（投資、娛樂基金、緊急備用金共用） */
export const FundTransactionSchema = new Schema<FundTransaction>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['deposit', 'expense'], required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() }
  },
  { _id: false }
)
