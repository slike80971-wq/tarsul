/**
 * Tarsul Chat Service | WebSocket Real-Time Messaging
 * Handles real-time message delivery, typing indicators, and presence.
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import net from 'net';

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ========================
// Type Definitions
// ========================

interface ConnectedUser {
  id: string;
  name: string;
  department?: string;
  status: string;
  publicKey?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  iv?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  senderDepartment?: string;
  channelId?: string;
  dmId?: string;
  type: string;
  replyToId?: string;
  createdAt: string;
}

interface CallSignal {
  callId: string;
  from: string;
  to?: string;
  callType?: 'audio' | 'video';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// ========================
// State
// ========================

const connectedUsers = new Map<string, ConnectedUser>();
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, string>(); // socketId -> userId

// ========================
// Connection Handlers
// ========================

io.on('connection', (socket) => {
  console.log(`[Tarsul] Socket connected: ${socket.id}`);

  socket.on('auth', (data: { userId: string; name: string; department?: string; publicKey?: string }) => {
    const { userId, name, department, publicKey } = data;
    userSockets.set(userId, socket.id);
    socketUsers.set(socket.id, userId);

    const userInfo: ConnectedUser = { id: userId, name, department, status: 'online', publicKey };
    connectedUsers.set(userId, userInfo);

    io.emit('user-status-change', { userId, status: 'online', user: userInfo });

    const onlineUsers = Array.from(connectedUsers.values());
    socket.emit('online-users', { users: onlineUsers });

    console.log(`[Tarsul] User "${name}" (${userId}) online. Total: ${connectedUsers.size}`);
  });

  socket.on('send-message', (data: ChatMessage) => {
    const userId = socketUsers.get(socket.id);
    if (!userId) return;

    const message: ChatMessage = {
      ...data,
      id: data.id || Math.random().toString(36).substr(2, 12),
      createdAt: data.createdAt || new Date().toISOString(),
    };

    // Use broadcast to avoid echoing back to the sender (sender adds via API response)
    socket.broadcast.emit('new-message', message);
    console.log(`[Tarsul] Message from ${message.senderName}: [${message.type}] broadcast to other clients`);
  });

  socket.on('typing', (data: { channelId?: string; dmId?: string }) => {
    const userId = socketUsers.get(socket.id);
    const userInfo = connectedUsers.get(userId || '');
    if (!userId || !userInfo) return;
    socket.broadcast.emit('user-typing', { userId, userName: userInfo.name, ...data });
  });

  socket.on('stop-typing', (data: { channelId?: string; dmId?: string }) => {
    const userId = socketUsers.get(socket.id);
    if (!userId) return;
    socket.broadcast.emit('user-stop-typing', { userId, ...data });
  });

  // ========================
  // WebRTC Call Signaling
  // ========================

  // Call offer: caller -> callee
  socket.on('call-offer', (data: CallSignal & { fromName: string; fromAvatar?: string; callType: 'audio' | 'video'; sdp: any }) => {
    const userId = socketUsers.get(socket.id);
    if (!userId || !data.to) return;
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-offer', {
        callId: data.callId,
        from: userId,
        fromName: data.fromName,
        fromAvatar: data.fromAvatar,
        to: data.to,
        callType: data.callType,
        sdp: data.sdp,
      });
      console.log(`[Tarsul] Call offer from ${data.fromName} to ${data.to} (${data.callType})`);
    } else {
      // Target offline — reject immediately
      socket.emit('call-reject', { callId: data.callId, from: data.to });
    }
  });

  // Call answer: callee -> caller
  socket.on('call-answer', (data: CallSignal & { sdp: any }) => {
    const userId = socketUsers.get(socket.id);
    if (!userId || !data.callId) return;
    // Forward to the caller (look up who has the call)
    for (const [uid, sid] of userSockets) {
      if (uid !== userId) {
        io.to(sid).emit('call-answer', { callId: data.callId, from: userId, sdp: data.sdp });
      }
    }
    console.log(`[Tarsul] Call answer from ${userId} for call ${data.callId}`);
  });

  // ICE candidate: either peer -> other
  socket.on('call-ice-candidate', (data: CallSignal & { candidate: any }) => {
    const userId = socketUsers.get(socket.id);
    if (!userId || !data.callId) return;
    socket.broadcast.emit('call-ice-candidate', {
      callId: data.callId,
      from: userId,
      candidate: data.candidate,
    });
  });

  // Call reject: callee -> caller
  socket.on('call-reject', (data: CallSignal) => {
    const userId = socketUsers.get(socket.id);
    if (!userId || !data.callId) return;
    socket.broadcast.emit('call-reject', { callId: data.callId, from: userId });
    console.log(`[Tarsul] Call ${data.callId} rejected by ${userId}`);
  });

  // Call hangup: either peer
  socket.on('call-hangup', (data: CallSignal) => {
    const userId = socketUsers.get(socket.id);
    if (!userId || !data.callId) return;
    socket.broadcast.emit('call-hangup', { callId: data.callId, from: userId });
    console.log(`[Tarsul] Call ${data.callId} hung up by ${userId}`);
  });

  socket.on('disconnect', () => {
    const userId = socketUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(userId);
      userSockets.delete(userId);
      socketUsers.delete(socket.id);
      io.emit('user-status-change', { userId, status: 'offline' });
      console.log(`[Tarsul] User "${userId}" disconnected. Online: ${connectedUsers.size}`);
    }
  });

  socket.on('error', (error) => {
    console.error(`[Tarsul] Socket error (${socket.id}):`, error);
  });
});

// ========================
// Start Server
// ========================

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[Tarsul] Chat WebSocket server running on port ${PORT}`);
  console.log(`[Tarsul] E2EE: Messages encrypted client-side before transmission`);
});

// ========================
// Next.js Keeper - Ensures Next.js dev server stays alive
// ========================

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(true));
    tester.once('listening', () => { tester.close(); resolve(false); });
    tester.listen(port, '0.0.0.0');
  });
}

async function ensureNextJs() {
  const isRunning = await checkPort(3000);

  if (!isRunning) {
    console.log('[Tarsul-Keeper] Next.js not running, starting...');
    const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
      cwd: '/home/z/my-project',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    child.stdout?.on('data', (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) console.log(`[Next.js] ${msg}`);
    });
    child.stderr?.on('data', (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) console.error(`[Next.js] ${msg}`);
    });
    child.on('exit', (code) => {
      console.log(`[Tarsul-Keeper] Next.js exited (${code}), restarting in 5s...`);
      setTimeout(ensureNextJs, 5000);
    });
  } else {
    console.log('[Tarsul-Keeper] Next.js already running on port 3000');
  }
}

// Start Next.js keeper after a short delay
setTimeout(ensureNextJs, 3000);

process.on('SIGTERM', () => {
  console.log('[Tarsul] Shutting down...');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Tarsul] Shutting down...');
  httpServer.close(() => process.exit(0));
});