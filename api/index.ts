/**
 * Vercel Serverless Function 入口。
 * vercel.json 把所有 /api/* 轉到這裡，Express app 本身就是 (req, res) handler。
 */
export { default } from '../server/app.js'
