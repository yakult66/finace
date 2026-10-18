import mongoose from 'mongoose'

/**
 * 連線 MongoDB。Serverless 環境下每次呼叫都會經過這裡，
 * 已連線時直接返回，避免重複建立連線。
 */
export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return

  const uri = process.env.MONGODB_URI
  if (!uri || uri.includes('<db_password>')) {
    throw new Error('MONGODB_URI 未設定或仍包含 <db_password>')
  }

  await mongoose.connect(uri)
  console.log('✅ 已連線至 MongoDB')
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1
}
