'use client';

import { useEffect, useRef } from 'react';
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket';
import { getGlobalState, setState, type User, type Message, type ChannelMessage } from '@/components/chat';

export function useSocketEvents(isAuthenticated: boolean, currentUser: User | null) {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      disconnectSocket();
      connectedRef.current = false;
      return;
    }

    if (connectedRef.current) return;
    connectedRef.current = true;

    const sock = connectSocket(currentUser.id, currentUser.name);

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      const state = getGlobalState();
      if (state.activeConversation?.id === data.conversationId) {
        setState({ messages: [...state.messages, data.message] });
      }
      const updatedConversations = state.conversations.map(c => {
        if (c.id === data.conversationId) {
          return { ...c, messages: [data.message], updatedAt: new Date().toISOString() };
        }
        return c;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setState({ conversations: updatedConversations });
    };

    const handleChannelMessage = (data: { channelId: string; message: ChannelMessage }) => {
      const state = getGlobalState();
      const updatedChannels = state.channels.map(ch => {
        if (ch.id === data.channelId) {
          return { ...ch, messages: [data.message], updatedAt: new Date().toISOString() };
        }
        return ch;
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setState({ channels: updatedChannels });
    };

    const handleUserOnline = (data: { userId: string }) => {
      const state = getGlobalState();
      const updatedConversations = state.conversations.map(c => ({
        ...c,
        members: c.members.map(m =>
          m.user.id === data.userId ? { ...m, user: { ...m.user, status: 'متصل' } } : m
        ),
      }));
      setState({ conversations: updatedConversations });
    };

    const handleUserOffline = (data: { userId: string }) => {
      const state = getGlobalState();
      const updatedConversations = state.conversations.map(c => ({
        ...c,
        members: c.members.map(m =>
          m.user.id === data.userId ? { ...m, user: { ...m.user, status: 'غير متصل' } } : m
        ),
      }));
      setState({ conversations: updatedConversations });
    };

    sock.on('new-message', handleNewMessage);
    sock.on('new-channel-message', handleChannelMessage);
    sock.on('user-online', handleUserOnline);
    sock.on('user-offline', handleUserOffline);

    return () => {
      sock.off('new-message', handleNewMessage);
      sock.off('new-channel-message', handleChannelMessage);
      sock.off('user-online', handleUserOnline);
      sock.off('user-offline', handleUserOffline);
    };
  }, [isAuthenticated, currentUser?.id]);
}
