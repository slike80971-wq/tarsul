import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track online users
const onlineUsers = new Map<string, string>() // socketId -> userId

io.on('connection', (socket) => {
  console.log(`[Chat] User connected: ${socket.id}`)

  // User joins with their userId to track online status
  socket.on('user:online', (userId: string) => {
    onlineUsers.set(socket.id, userId)
    // Notify others about online status
    io.emit('user:status', { userId, isOnline: true })
    console.log(`[Chat] User ${userId} is online (socket: ${socket.id})`)
  })

  // Join a specific conversation room
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`)
    console.log(`[Chat] Socket ${socket.id} joined conversation ${conversationId}`)
  })

  // Leave a conversation room
  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
    console.log(`[Chat] Socket ${socket.id} left conversation ${conversationId}`)
  })

  // Send a message to a conversation
  socket.on('message:send', (data: {
    conversationId: string
    message: {
      id: string
      senderId: string
      content: string
      type: string
      mediaUrl: string
      mediaName: string
      createdAt: string
    }
  }) => {
    // Broadcast to all users in the conversation room
    io.to(`conversation:${data.conversationId}`).emit('message:new', data.message)
    console.log(`[Chat] Message in ${data.conversationId} from ${data.message.senderId}`)
  })

  // Typing indicator
  socket.on('typing:start', (data: { conversationId: string; userId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing:indicator', {
      conversationId: data.conversationId,
      userId: data.userId,
      isTyping: true
    })
  })

  socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('typing:indicator', {
      conversationId: data.conversationId,
      userId: data.userId,
      isTyping: false
    })
  })

  // Read receipts
  socket.on('message:read', (data: { conversationId: string; userId: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('message:read_receipt', {
      conversationId: data.conversationId,
      userId: data.userId
    })
  })

  // Disconnect
  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id)
    if (userId) {
      onlineUsers.delete(socket.id)
      // Notify others about offline status
      io.emit('user:status', { userId, isOnline: false })
      console.log(`[Chat] User ${userId} is offline`)
    }
    console.log(`[Chat] Socket ${socket.id} disconnected`)
  })

  socket.on('error', (error) => {
    console.error(`[Chat] Socket error (${socket.id}):`, error)
  })
})

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`[Chat] WebSocket service running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Chat] Received SIGTERM, shutting down...')
  httpServer.close(() => {
    console.log('[Chat] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Chat] Received SIGINT, shutting down...')
  httpServer.close(() => {
    console.log('[Chat] Server closed')
    process.exit(0)
  })
})
