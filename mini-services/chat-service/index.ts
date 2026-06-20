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

interface OnlineUser {
  id: string
  name: string
  socketId: string
}

const onlineUsers = new Map<string, OnlineUser>()

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  socket.on('join', (data: { userId: string; userName: string }) => {
    onlineUsers.set(data.userId, {
      id: data.userId,
      name: data.userName,
      socketId: socket.id,
    })

    // Notify others
    socket.broadcast.emit('user-online', {
      userId: data.userId,
      userName: data.userName,
    })

    console.log(`${data.userName} joined (online: ${onlineUsers.size})`)
  })

  socket.on('typing', (data: { conversationId: string; userId: string }) => {
    socket.broadcast.emit('user-typing', data)
  })

  socket.on('stop-typing', (data: { conversationId: string; userId: string }) => {
    socket.broadcast.emit('user-stopped-typing', data)
  })

  socket.on('send-message', (data: { conversationId: string; message: any }) => {
    socket.broadcast.emit('new-message', {
      conversationId: data.conversationId,
      message: data.message,
    })
  })

  socket.on('channel-message', (data: { channelId: string; message: any }) => {
    socket.broadcast.emit('new-channel-message', {
      channelId: data.channelId,
      message: data.message,
    })
  })

  // Voice call signaling
  socket.on('voice-call-signal', (data: { targetUserId: string; signal: any; callId: string }) => {
    const targetUser = onlineUsers.get(data.targetUserId)
    if (targetUser) {
      io.to(targetUser.socketId).emit('incoming-call-signal', {
        fromUserId: data.targetUserId,
        signal: data.signal,
        callId: data.callId,
      })
    }
  })

  socket.on('disconnect', () => {
    let disconnectedUser: OnlineUser | undefined;
    for (const [userId, user] of onlineUsers) {
      if (user.socketId === socket.id) {
        disconnectedUser = user
        onlineUsers.delete(userId)
        break
      }
    }

    if (disconnectedUser) {
      socket.broadcast.emit('user-offline', {
        userId: disconnectedUser.id,
        userName: disconnectedUser.name,
      })
      console.log(`${disconnectedUser.name} disconnected (online: ${onlineUsers.size})`)
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Chat WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Shutting down chat server...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Shutting down chat server...')
  httpServer.close(() => process.exit(0))
})
