'use client';

import { useEffect, useRef, useState } from 'react';
import { AuthModal } from '@/components/chat/auth-modal';
import { Sidebar } from '@/components/chat/sidebar';
import { ChatList } from '@/components/chat/chat-list';
import { ChatView, ChannelView, UsersView, ParticipantSettings, AdminDashboard, useCallTimer, type User } from '@/components/chat';
import { useChatStore } from '@/lib/chat-store';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useSocketEvents } from '@/hooks/use-socket-events';

interface InitialData {
  users: User[];
  conversations: any[];
  channels: any[];
  allMessages: any[];
  allChannelMessages: any[];
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function ChatAppClient({ initialData }: { initialData: InitialData }) {
  const hydrated = useHydrated();
  const initializedRef = useRef(false);
  const currentView = useChatStore(s => s.currentView);
  const isAuthenticated = useChatStore(s => s.isAuthenticated);
  const activeConversation = useChatStore(s => s.activeConversation);
  const currentUser = useChatStore(s => s.currentUser);
  useCallTimer();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        useChatStore.getState().setState({
          currentUser: user,
          isAuthenticated: true,
          showAuthModal: false,
        });
      } catch {
        localStorage.removeItem('chat-user');
      }
    }

    useChatStore.getState().setState({
      conversations: initialData.conversations,
      channels: initialData.channels,
      allMessages: initialData.allMessages || [],
      allChannelMessages: initialData.allChannelMessages || [],
    });
  }, [initialData]);

  useSocketEvents(isAuthenticated, currentUser);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      localStorage.setItem('chat-user', JSON.stringify(currentUser));
    }
  }, [isAuthenticated, currentUser]);

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden" dir="rtl">
      <AuthModal initialUsers={{ users: initialData.users as User[] }} />
      <ParticipantSettings />

      {isAuthenticated ? (
        <>
          <Sidebar />
          <div className="flex-1 flex min-w-0">
            {currentView === 'chats' && (
              <>
                {!activeConversation ? (
                  <ChatList />
                ) : (
                  <>
                    <div className="hidden lg:block w-72 border-l border-gray-100 max-h-screen overflow-hidden flex flex-col">
                      <ChatList />
                    </div>
                    <ChatView />
                  </>
                )}
              </>
            )}
            {currentView === 'channels' && <ChannelView />}
            {currentView === 'settings' && <UsersView />}
            {currentView === 'admin' && <AdminDashboard />}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
          <div className="text-center space-y-5 px-4">
            <div className="w-28 h-28 mx-auto rounded-2xl bg-[#1E3A8A] flex items-center justify-center shadow-2xl shadow-blue-300/40">
              <MessageCircle className="w-14 h-14 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">مرحباً بك في تطبيق الدردشة</h1>
              <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                سجّل دخولك للبدء في المحادثات مع أصدقائك وزملائك في الوقت الفعلي
              </p>
            </div>
            <button
              onClick={() => useChatStore.getState().setState({ showAuthModal: true })}
              className="bg-[#1E3A8A] hover:bg-[#152D6E] text-white px-10 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-300/30 hover:shadow-blue-400/40 active:scale-[0.98]"
            >
              تسجيل الدخول
            </button>
            <p className="text-xs text-gray-400">للتجربة: admin@example.com / admin123</p>
          </div>
        </div>
      )}
    </div>
  );
}
