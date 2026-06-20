import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  status: string;
  role: string;
  timezone?: string;
  approvalStatus?: string;
  isBlocked?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; avatar?: string };
}

export interface Conversation {
  id: string;
  name?: string;
  type: string;
  status: string;
  isFavorite: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  messages: Message[];
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  notifications: boolean;
  user: User;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
  members: ChannelMember[];
  messages: ChannelMessage[];
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: string;
  user: User;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  type: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  createdAt: string;
  sender?: { id: string; name: string; avatar?: string };
}

export interface VoiceCall {
  id: string;
  callerId: string;
  receiverId: string;
  conversationId?: string;
  channelId?: string;
  status: string;
  duration: number;
  createdAt: string;
  endedAt?: string;
}

export type ViewType = 'chats' | 'channels' | 'settings' | 'admin';

interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  currentView: ViewType;
  activeConversation: Conversation | null;
  activeChannel: Channel | null;
  conversations: Conversation[];
  messages: Message[];
  channels: Channel[];
  channelMessages: ChannelMessage[];
  allMessages: Message[];
  allChannelMessages: ChannelMessage[];
  showParticipantSettings: boolean;
  selectedParticipant: User | null;
  chatFilter: string;
  searchQuery: string;
  socketConnected: boolean;
  typingUser: string | null;
  activeCall: VoiceCall | null;
  callStatus: 'idle' | 'ringing' | 'connected' | 'ended';
  callTimer: number;
  callMuted: boolean;
}

interface AppActions {
  setState: (partial: Partial<AppState>) => void;
}

export const useChatStore = create<AppState & AppActions>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  showAuthModal: true,
  currentView: 'chats',
  activeConversation: null,
  activeChannel: null,
  conversations: [],
  messages: [],
  channels: [],
  channelMessages: [],
  allMessages: [],
  allChannelMessages: [],
  showParticipantSettings: false,
  selectedParticipant: null,
  chatFilter: 'الكل',
  searchQuery: '',
  socketConnected: false,
  typingUser: null,
  activeCall: null,
  callStatus: 'idle',
  callTimer: 0,
  callMuted: false,
  setState: (partial) => set(partial),
}));

// Convenience alias for backward compatibility
export const setState = (partial: Partial<AppState>) => useChatStore.getState().setState(partial);
export const getGlobalState = () => useChatStore.getState();
export const useAppState = () => useChatStore();

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
