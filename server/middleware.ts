import { timingSafeEqual } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { connectDb } from './db.js'

/** 每個 API 請求前確保資料庫已連線（Serverless 冷啟動時也適用） */
export const ensureDb: RequestHandler = async (_req, _res, next) => {
  await connectDb()
  next()
}

/**
 * 有設定 API_TOKEN 時，請求必須帶 `Authorization: Bearer <token>`。
 * 未設定時不驗證，方便本機開發；正式環境務必在 Vercel 設定此變數。
 */
export const requireToken: RequestHandler = (req, res, next) => {
  const expected = process.env.API_TOKEN
  if (!expected) return next()

  const header = req.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length === b.length && timingSafeEqual(a, b)) return next()

  res.status(401).json({ error: 'Unauthorized' })
}

/** 統一錯誤處理：Express 5 會自動把 async handler 拋出的錯誤送到這裡 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: err.message })
    return
  }
  console.error('❌ API Error:', err)
  res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
}
