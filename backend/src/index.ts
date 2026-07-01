import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { errorHandler } from './middleware/error.middleware'
import listingsRouter from './routes/listings'
import ordersRouter from './routes/orders'
import sellersRouter from './routes/sellers'
import webhookRouter from './routes/webhook'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
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
