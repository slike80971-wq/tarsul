'use client';

import { MessageCircle, Hash, Users, Shield, Bell, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useChatStore } from '@/lib/chat-store';

export function Sidebar() {
  const currentView = useChatStore(s => s.currentView);
  const conversations = useChatStore(s => s.conversations);
  const channels = useChatStore(s => s.channels);
  const currentUser = useChatStore(s => s.currentUser);
  const isAdmin = currentUser?.role === 'مسؤول';

  const navItems = [
    { id: 'chats' as const, icon: MessageCircle, label: 'المحادثات', badge: conversations.length },
    { id: 'channels' as const, icon: Hash, label: 'القنوات', badge: channels.length },
    ...(isAdmin ? [{ id: 'admin' as const, icon: Shield, label: 'لوحة التحكم' }] : []),
    { id: 'settings' as const, icon: Users, label: 'المستخدمين' },
  ];

  return (
    <div className="w-16 bg-[#1E3A8A] flex flex-col items-center py-4 gap-2 shrink-0">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => useChatStore.getState().setState({ currentView: item.id, activeConversation: null, activeChannel: null })}
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            currentView === item.id
              ? item.id === 'admin'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
          {item.badge > 0 && (
            <Badge className={`absolute -top-1 -left-1 h-4 min-w-4 px-1 text-[10px] text-white border-0 ${
              item.id === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}>{item.badge}</Badge>
          )}
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={() => {
          localStorage.removeItem('chat-user');
          useChatStore.getState().setState({ currentUser: null, isAuthenticated: true, showAuthModal: true, activeConversation: null, activeChannel: null, activeCall: null, callStatus: 'idle' });
        }}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500/20 transition-all"
        title="تسجيل الخروج"
      >
        <LogOut className="w-5 h-5" />
      </button>
      <div className="mt-2 text-[9px] text-white/30">Z.ai Chat</div>
    </div>
  );
}
