import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
dotenv.config()

import sessionRouter from './routes/session.js'
import authRouter from './routes/auth.js'
import { initSessionSocket } from './socket/sessionSocket.js'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
})

app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.use('/api/session', sessionRouter)
app.use('/auth', authRouter)

app.get('/', (req, res) => res.json({ status: 'VibeLink server running' }))

initSessionSocket(io)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log('VibeLink server running on port ' + PORT)
})