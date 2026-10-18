import mongoose, { Schema } from 'mongoose'
import type { PlannedItem } from '../../shared/types.js'

const PlannedItemSchema = new Schema<PlannedItem>(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    note: String
  },
  { timestamps: true }
)

export const PlannedItemModel =
  mongoose.models.PlannedItem || mongoose.model<PlannedItem>('PlannedItem', PlannedItemSchema)
