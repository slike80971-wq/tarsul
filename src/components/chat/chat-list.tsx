'use client';

import { Search, Star, Clock, MessageSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAppState, setState, type Conversation } from '@/components/chat';

const statusColors: Record<string, string> = {
  'متصل': 'bg-emerald-500',
  'متاح': 'bg-amber-500',
  'غير متصل': 'bg-red-500',
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `${diffMin} دقائق`;
  if (diffHour < 24) return `${diffHour} ساعة`;
  return `${Math.floor(diffMs / 86400000)} يوم`;
}

const filters = ['الكل', 'جديدة', 'مفضلة', 'مكتملة', 'مفتوحة', 'مغلقة'];

export function ChatList() {
  const conversations = useAppState(s => s.conversations);
  const activeConversation = useAppState(s => s.activeConversation);
  const currentUser = useAppState(s => s.currentUser);
  const chatFilter = useAppState(s => s.chatFilter);
  const searchQuery = useAppState(s => s.searchQuery);

  const filtered = conversations.filter((c) => {
    if (chatFilter === 'مفضلة' && !c.isFavorite) return false;
    if (chatFilter !== 'الكل' && chatFilter !== 'مفضلة' && c.status !== chatFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.members.some(m => m.user.name.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900 mb-3">محادثاتي</h1>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ابحث عن محادثاتك..."
            value={searchQuery}
            onChange={(e) => setState({ searchQuery: e.target.value })}
            className="h-10 pr-9 pl-4 bg-gray-50 border-gray-200 rounded-lg text-sm"
            dir="rtl"
          />
          {searchQuery && (
            <button onClick={() => setState({ searchQuery: '' })} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setState({ chatFilter: filter })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                chatFilter === filter ? 'bg-[#1E3A8A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">لا توجد محادثات</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            {filtered.map((conv) => {
              const lastMsg = conv.messages[0];
              const otherMember = conv.members.find(m => m.user.id !== currentUser?.id);
              const memberUser = otherMember?.user || conv.members[0]?.user;
              const isActive = activeConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setState({ activeConversation: conv, currentView: 'chats' })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setState({ activeConversation: conv, currentView: 'chats' }); }}
                  className={`relative bg-white rounded-xl p-3 border transition-all text-right w-full cursor-pointer ${
                    isActive ? 'border-[#1E3A8A] shadow-md shadow-blue-100 ring-1 ring-[#1E3A8A]/20' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                  dir="rtl"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {memberUser?.name?.charAt(0) || '?'}
                      </div>
                      <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[memberUser?.status || 'غير متصل']}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{conv.name || memberUser?.name}</p>
                        {conv.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                          conv.status === 'مفتوحة' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
                          conv.status === 'مغلقة' ? 'border-red-200 text-red-600 bg-red-50' : 'border-blue-200 text-blue-600 bg-blue-50'
                        }`}>
                          {conv.status}
                        </Badge>
                        <span className="text-[10px] text-gray-400">{getTimeAgo(conv.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  {lastMsg && <p className="text-xs text-gray-500 mt-2 truncate leading-relaxed">{lastMsg.sender?.name}: {lastMsg.content}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
