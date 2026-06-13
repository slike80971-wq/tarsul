/**
 * Tarsul - تراسل | Chat Store (Zustand)
 * Manages channels, direct messages, messages, and UI state.
 */
import { create } from 'zustand';

export interface ChannelMember {
  id: string;
  name: string;
  avatar?: string | null;
  status: string;
  department?: string | null;
  role: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  icon?: string | null;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  lastRead?: Date | string | null;
  userRole?: string;
}

export interface DMConversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string | null;
    status: string;
    department?: string | null;
  };
  lastMessageAt: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  content: string;
  iv?: string | null;
  senderId: string;
  channelId?: string | null;
  dmId?: string | null;
  type: string;
  replyToId?: string | null;
  metadata?: string | null;
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string | null;
    role?: string;
    department?: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { id: string; name: string };
  } | null;
}

interface ChatState {
  // Data
  channels: Channel[];
  conversations: DMConversation[];
  messages: Message[];
  activeChannelId: string | null;
  activeConversationId: string | null;
  activeView: 'channels' | 'dm' | 'none';
  sidebarOpen: boolean;
  createChannelOpen: boolean;
  newDMOpen: boolean;
  usersList: DMConversation['otherUser'][];
  loadingMessages: boolean;
  sendingMessage: boolean;

  // Channel actions
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;

  // DM actions
  setConversations: (conversations: DMConversation[]) => void;
  addConversation: (conversation: DMConversation) => void;

  // Message actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  prependMessages: (messages: Message[]) => void;

  // Navigation
  setActiveChannel: (channelId: string) => void;
  setActiveConversation: (conversationId: string) => void;
  setActiveView: (view: 'channels' | 'dm' | 'none') => void;

  // UI
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCreateChannelOpen: (open: boolean) => void;
  setNewDMOpen: (open: boolean) => void;
  setUsersList: (users: DMConversation['otherUser'][]) => void;
  setLoadingMessages: (loading: boolean) => void;
  setSendingMessage: (sending: boolean) => void;

  // Reset
  reset: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  channels: [],
  conversations: [],
  messages: [],
  activeChannelId: null,
  activeConversationId: null,
  activeView: 'none',
  sidebarOpen: true,
  createChannelOpen: false,
  newDMOpen: false,
  usersList: [],
  loadingMessages: false,
  sendingMessage: false,

  setChannels: (channels) => set({ channels }),
  addChannel: (channel) => set((s) => ({ channels: [channel, ...s.channels] })),

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) => set((s) => ({
    conversations: [conversation, ...s.conversations.filter(c => c.id !== conversation.id)],
  })),

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => {
    // Deduplicate: skip if message with same ID already exists
    if (s.messages.some((m) => m.id === message.id)) return s;
    return { messages: [...s.messages, message] };
  }),
  prependMessages: (messages) => set((s) => {
    // Deduplicate prepended messages
    const existingIds = new Set(s.messages.map((m) => m.id));
    const unique = messages.filter((m) => !existingIds.has(m.id));
    return { messages: [...unique, ...s.messages] };
  }),

  setActiveChannel: (channelId) => set({
    activeChannelId: channelId,
    activeConversationId: null,
    activeView: 'channels',
    messages: [],
  }),
  setActiveConversation: (conversationId) => set({
    activeConversationId: conversationId,
    activeChannelId: null,
    activeView: 'dm',
    messages: [],
  }),
  setActiveView: (view) => set({ activeView: view }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCreateChannelOpen: (open) => set({ createChannelOpen: open }),
  setNewDMOpen: (open) => set({ newDMOpen: open }),
  setUsersList: (users) => set({ usersList: users }),
  setLoadingMessages: (loading) => set({ loadingMessages: loading }),
  setSendingMessage: (sending) => set({ sendingMessage: sending }),

  reset: () => set({
    channels: [],
    conversations: [],
    messages: [],
    activeChannelId: null,
    activeConversationId: null,
    activeView: 'none',
  }),
}));