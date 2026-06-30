import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { errorHandler } from './middleware/error.middleware'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Error handler must be the last middleware registered
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Truvend backend running on port ${PORT}`)
})
