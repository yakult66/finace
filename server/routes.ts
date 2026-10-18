import { Router } from 'express'
import type { Model } from 'mongoose'

/** 由伺服器維護、不接受用戶端覆寫的欄位 */
const PROTECTED_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt']

function sanitize(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  const data = { ...(body as Record<string, unknown>) }
  for (const key of PROTECTED_FIELDS) delete data[key]
  return data
}

const LEAN_PROJECTION = { _id: 0, __v: 0 }

/**
 * 多筆文件的資源（以 `id` 欄位識別）：
 *   GET    /      取得全部
 *   PUT    /:id   新增或更新單筆
 *   DELETE /:id   刪除單筆
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function collectionRouter(model: Model<any>): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json(await model.find({}, LEAN_PROJECTION).lean())
  })

  router.put('/:id', async (req, res) => {
    const id = req.params.id
    const saved = await model
      .findOneAndUpdate(
        { id },
        { $set: { ...sanitize(req.body), id } },
        { upsert: true, returnDocument: 'after', runValidators: true, projection: LEAN_PROJECTION }
      )
      .lean()
    res.json(saved)
  })

  router.delete('/:id', async (req, res) => {
    const result = await model.deleteOne({ id: req.params.id })
    res.status(result.deletedCount ? 204 : 404).end()
  })

  return router
}

/**
 * 只有一份文件的資源（例如固定支出設定）：
 *   GET /  取得文件，不存在時回傳 defaults
 *   PUT /  只更新送來的欄位，未送的欄位保留原值
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function singletonRouter(model: Model<any>, defaults: Record<string, unknown>): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const doc = await model.findOne({}, LEAN_PROJECTION).lean()
    res.json(doc ?? defaults)
  })

  router.put('/', async (req, res) => {
    const data = sanitize(req.body)
    // 同一欄位不能同時出現在 $set 與 $setOnInsert，只補用戶端沒送的預設值
    const insertDefaults = Object.fromEntries(Object.entries(defaults).filter(([key]) => !(key in data)))
    const saved = await model
      .findOneAndUpdate(
        {},
        { $set: data, $setOnInsert: insertDefaults },
        { upsert: true, returnDocument: 'after', runValidators: true, projection: LEAN_PROJECTION }
      )
      .lean()
    res.json(saved)
  })

  return router
}
