/**
 * Tarsul - تراسل | WebSocket Hook
 * Manages real-time socket connection for the chat platform.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user, token } = useAuthStore();
  const { addMessage, setActiveView, activeChannelId, activeConversationId } = useChatStore();

  const connect = useCallback(() => {
    if (!user || socketRef.current?.connected) return;

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[Tarsul] Socket connected');
      // Authenticate with user info
      socket.emit('auth', {
        userId: user.id,
        name: user.name,
        department: user.department,
        publicKey: user.publicKey,
      });
    });

    socket.on('disconnect', () => {
      console.log('[Tarsul] Socket disconnected');
    });

    // Real-time message received
    socket.on('new-message', (message: any) => {
      // Only add message if it belongs to the active view
      if (message.channelId && message.channelId === activeChannelId) {
        addMessage(message);
      } else if (message.dmId && message.dmId === activeConversationId) {
        addMessage(message);
      }
    });

    // Typing indicators
    socket.on('user-typing', (data: any) => {
      // Could be used to show typing indicators
    });

    socket.on('user-stop-typing', (data: any) => {
      // Could be used to hide typing indicators
    });

    socket.on('online-users', (data: any) => {
      // Update online user count
    });

    socketRef.current = socket;
  }, [user, activeChannelId, activeConversationId, addMessage]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', message);
    }
  }, []);

  const sendTyping = useCallback((data: { channelId?: string; dmId?: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', data);
    }
  }, []);

  const stopTyping = useCallback((data: { channelId?: string; dmId?: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop-typing', data);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return { sendMessage, sendTyping, stopTyping, socket: socketRef };
}