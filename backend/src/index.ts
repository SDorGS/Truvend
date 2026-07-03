import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'

import { errorHandler } from './middleware/error.middleware'
import listingsRouter from './routes/listings'
import ordersRouter from './routes/orders'
import sellersRouter from './routes/sellers'
import webhookRouter from './routes/webhook'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use('/webhook', express.raw({ type: 'application/json' }))
app.use('/webhook', (req: Request, _res: Response, next: NextFunction) => {
  if (Buffer.isBuffer(req.body)) {
    const rawBody = req.body.toString('utf8')
    try {
      req.body = JSON.parse(rawBody)
      ;(req as Request & { rawBody?: string }).rawBody = rawBody
    } catch {
      ;(req as Request & { rawBody?: string }).rawBody = rawBody
    }
  }

  next()
})
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/listings', listingsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/seller', sellersRouter)
app.use('/webhook', webhookRouter)

// Error handler must be the last middleware registered
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Truvend backend running on port ${PORT}`)
})
