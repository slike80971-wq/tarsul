// Socket.io client singleton for real-time messaging
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(userId: string, userName: string): Socket {
  if (socket?.connected) {
    socket.emit('join', { userId, userName });
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '/?XTransformPort=3003';
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    socket?.emit('join', { userId, userName });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitTyping(conversationId: string, userId: string) {
  socket?.emit('typing', { conversationId, userId });
}

export function emitStopTyping(conversationId: string, userId: string) {
  socket?.emit('stop-typing', { conversationId, userId });
}

export function emitMessage(conversationId: string, message: unknown) {
  socket?.emit('send-message', { conversationId, message });
}

export function emitChannelMessage(channelId: string, message: unknown) {
  socket?.emit('channel-message', { channelId, message });
}
