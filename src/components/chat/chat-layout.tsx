/**
 * Tarsul - تراسل | Main Chat Layout
 * Enterprise-grade encrypted chat interface with sidebar, message area, and E2EE.
 * Includes: dark mode, online users panel, user profile dialog, emoji picker,
 * message actions, date separators, typing indicator, toast notifications, pinned messages.
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore, Message } from '@/store/chat-store';
import { useSocket } from '@/hooks/use-socket';
import { CryptoManager } from '@/lib/crypto';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Hash, MessageCircle, Send, Shield, Lock, Plus, Search, Settings, LogOut,
  Menu, X, Users, ChevronLeft, Loader2,
  KeyRound, Building2, ShieldCheck, Pin, Reply,
  Paperclip, Smile, AtSign, Mic, Phone, Video, Edit3, Sun, Moon,
  Copy, Trash2, Check, CheckCheck, PanelRight, TrendingUp,
  FileText, Image as ImageIcon, Download, Loader2 as DownloadLoader,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { TweetsPanel } from '@/components/chat/tweets-panel';
import { CallDialog, IncomingCallDialog, ActiveCallScreen } from '@/components/chat/call-ui';
import { useCall } from '@/hooks/use-call';
import { FileUploadDialog, type UploadedFile } from '@/components/chat/file-upload-dialog';

// ========================
// Utility: Format time (HH:MM)
// ========================
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
}

// ========================
// Utility: Date separator label
// ========================
function getDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'اليوم';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'أمس';

  return date.toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ========================
// Utility: Check if two dates are same day
// ========================
function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ========================
// Utility: Get initials
// ========================
function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0);
}

// ========================
// Status Dot
// ========================
function StatusDot({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const color = status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-500' : status === 'do_not_disturb' ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-600';
  const sizeClass = size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const ringClass = size === 'md' ? 'ring-[2.5px]' : 'ring-2';
  const ringColor = 'ring-white dark:ring-gray-900';
  return (
    <span className={`inline-block ${sizeClass} rounded-full ${color} ${ringClass} ${ringColor}`} />
  );
}

// ========================
// Encryption Badge
// ========================
function EncryptionBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">E2EE</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>مشفّر من الطرف إلى الطرف (AES-256-GCM + RSA-OAEP)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ========================
// User Avatar
// ========================
function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = getInitials(name);
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-lg' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs';
  return (
    <Avatar className={sizeClass}>
      <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ========================
// Simple Emoji Picker
// ========================
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const emojis = [
    '😀','😂','😊','🥰','😎','🤔','😅','😢','👍','👎',
    '❤️','🔥','✅','⭐','🎉','🙏','💪','🤝','👏','💯',
    '🚀','💡','📌','🔒','🔐','✨','🎯','📝','💬','🔔',
  ];
  return (
    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 grid grid-cols-6 gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200" dir="ltr">
      {emojis.map((e) => (
        <button
          key={e}
          onClick={() => { onSelect(e); onClose(); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-lg"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ========================
// User Profile Dialog
// ========================
interface ProfileUserData {
  id: string;
  name: string;
  email?: string;
  department?: string | null;
  role?: string;
  status?: string;
  publicKey?: string | null;
}

function UserProfileDialog({
  user: profileUser,
  open,
  onOpenChange,
}: {
  user: ProfileUserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { token } = useAuthStore();
  const startDM = async () => {
    if (!token || !profileUser) return;
    try {
      const res = await fetch('/api/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: profileUser.id }),
      });
      const data = await res.json();
      if (data.conversation) {
        useChatStore.getState().addConversation(data.conversation);
        useChatStore.getState().setActiveConversation(data.conversation.id);
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Start DM error:', err);
    }
  };

  const fingerprint = profileUser?.publicKey
    ? profileUser.publicKey.slice(-16).replace(/[^\w]/g, '').toUpperCase()
    : null;

  const roleLabel = profileUser?.role === 'admin' ? 'مدير النظام' : profileUser?.role === 'manager' ? 'مدير' : 'عضو';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">ملف المستخدم</DialogTitle>
        </DialogHeader>
        {profileUser && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <UserAvatar name={profileUser.name} size="lg" />
              <span className="absolute bottom-0 left-0"><StatusDot status={profileUser.status || 'offline'} size="md" /></span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{profileUser.name}</h3>
              {profileUser.email && (
                <p className="text-sm text-muted-foreground mt-0.5" dir="ltr">{profileUser.email}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
              {profileUser.department && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="w-3 h-3 ml-1" />
                  {profileUser.department}
                </Badge>
              )}
            </div>
            {fingerprint && (
              <div className="w-full p-3 bg-muted rounded-lg">
                <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  بصمة المفتاح العام
                </p>
                <p className="text-xs font-mono text-foreground tracking-wider" dir="ltr">{fingerprint}</p>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <Button onClick={startDM} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <MessageCircle className="w-4 h-4 ml-2" />
                إرسال رسالة
              </Button>
              {profileUser.department && (
                <Button variant="outline" className="flex-1">
                  <Building2 className="w-4 h-4 ml-2" />
                  القسم
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ========================
// Online Users Panel
// ========================
function OnlineUsersPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { token } = useAuthStore();
  const [allUsers, setAllUsers] = useState<Array<{
    id: string; name: string; email: string; department: string | null; status: string; role: string;
  }>>([]);
  const [profileUser, setProfileUser] = useState<ProfileUserData | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    fetch('/api/users?excludeSelf=false', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.users) setAllUsers(d.users); })
      .catch(console.error);
  }, [open, token]);

  const online = allUsers.filter((u) => u.status === 'online');
  const away = allUsers.filter((u) => u.status === 'away' || u.status === 'do_not_disturb');
  const offline = allUsers.filter((u) => u.status === 'offline');

  const startDM = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: userId }),
      });
      const data = await res.json();
      if (data.conversation) {
        useChatStore.getState().addConversation(data.conversation);
        useChatStore.getState().setActiveConversation(data.conversation.id);
        onClose();
      }
    } catch (err) {
      console.error('Start DM error:', err);
    }
  };

  const openProfile = (user: typeof allUsers[0]) => {
    setProfileUser(user);
    setProfileOpen(true);
  };

  if (!open) return null;

  return (
    <>
      <div className="w-72 border-r flex flex-col h-full bg-card animate-slide-in-right" dir="rtl">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-[var(--tarsul-header-bg)]">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            أعضاء فريق العمل
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {/* Online */}
          {online.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider px-2 mb-2">
                متصل — {online.length}
              </p>
              {online.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openProfile(u)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--tarsul-hover)] transition-colors text-right group"
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar name={u.name} size="sm" />
                    <span className="absolute -bottom-0.5 -left-0.5"><StatusDot status="online" /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.department || u.role}</p>
                  </div>
                  <MessageCircle
                    className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); startDM(u.id); }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Away */}
          {away.length > 0 && (
            <div className="p-3 pt-0">
              <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 tracking-wider px-2 mb-2">
                بعيد — {away.length}
              </p>
              {away.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openProfile(u)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--tarsul-hover)] transition-colors text-right"
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar name={u.name} size="sm" />
                    <span className="absolute -bottom-0.5 -left-0.5"><StatusDot status={u.status} /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.department || u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Offline */}
          {offline.length > 0 && (
            <div className="p-3 pt-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-2 mb-2">
                غير متصل — {offline.length}
              </p>
              {offline.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openProfile(u)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--tarsul-hover)] transition-colors text-right opacity-60"
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar name={u.name} size="sm" />
                    <span className="absolute -bottom-0.5 -left-0.5"><StatusDot status="offline" /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.department || u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      <UserProfileDialog user={profileUser} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

// ========================
// Channel Sidebar
// ========================
function ChannelSidebar() {
  const { channels, conversations, usersList, activeChannelId, activeConversationId, activeView,
    setActiveChannel, setActiveConversation, setActiveView, sidebarOpen, toggleSidebar,
    createChannelOpen, setCreateChannelOpen, newDMOpen, setNewDMOpen, setUsersList,
    messages } = useChatStore();
  const { user, token } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [dmSearch, setDmSearch] = useState('');
  const [showDMs, setShowDMs] = useState(true);
  const [showTeam, setShowTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; status: string; department: string | null }>>([]);
  const [profileUser, setProfileUser] = useState<ProfileUserData | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  // Online user count from socket
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket.current) return;
    const handler = (data: { count: number }) => setOnlineCount(data.count || 0);
    socket.current.on('online-users', handler);
    return () => { socket.current?.off('online-users', handler); };
  }, [socket]);

  // Load channels
  useEffect(() => {
    if (!token) return;
    fetch('/api/channels', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.channels && useChatStore.getState().setChannels(d.channels))
      .catch(console.error);

    fetch('/api/dm', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.conversations && useChatStore.getState().setConversations(d.conversations))
      .catch(console.error);

    // Load all team members
    fetch('/api/users?excludeSelf=false', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.users) setTeamMembers(d.users); })
      .catch(console.error);
  }, [token]);

  const createChannel = async () => {
    if (!newChannelName.trim() || !token) return;
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newChannelName, description: newChannelDesc || undefined }),
    });
    const data = await res.json();
    if (data.channel) {
      useChatStore.getState().addChannel(data.channel);
      setNewChannelName('');
      setNewChannelDesc('');
      setCreateChannelOpen(false);
    }
  };

  const startDM = async (recipientId: string) => {
    if (!token) return;
    const res = await fetch('/api/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipientId }),
    });
    const data = await res.json();
    if (data.conversation) {
      useChatStore.getState().addConversation(data.conversation);
      setActiveConversation(data.conversation.id);
      setNewDMOpen(false);
    }
  };

  const searchUsers = async (q: string) => {
    setDmSearch(q);
    if (q.length < 1 || !token) return;
    const res = await fetch(`/api/users?search=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.users) setUsersList(data.users);
  };

  const filteredChannels = channels.filter((c) =>
    c.name.includes(search) || (c.description && c.description.includes(search))
  );

  const departmentChannels = filteredChannels.filter((c) => c.type === 'department');
  const regularChannels = filteredChannels.filter((c) => c.type === 'channel');
  const onlineTeam = teamMembers.filter((u) => u.status === 'online');

  // Collapsed sidebar
  if (!sidebarOpen) {
    return (
      <div className="w-16 bg-sidebar border-l flex flex-col items-center py-4 gap-3 transition-all duration-300">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </Button>
        <Separator className="w-8" />
        {channels.slice(0, 8).map((ch) => (
          <TooltipProvider key={ch.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={activeChannelId === ch.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}
                  onClick={() => setActiveChannel(ch.id)}
                >
                  <span className="text-lg">{ch.icon || '#'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{ch.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  }

  return (
    <div className="w-72 bg-sidebar border-l flex flex-col h-full transition-all duration-300" dir="rtl">
      {/* Header with logo + workspace + online count */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground text-base block leading-tight">تراسل</span>
              <span className="text-[10px] text-muted-foreground">مساحة العمل المؤسسية</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground h-8 w-8 lg:hidden">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Online count badge */}
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {onlineCount > 0 ? onlineCount : onlineTeam.length} متصل الآن
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث في القنوات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pr-9 text-sm bg-card border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* New Conversation Buttons */}
        <div className="p-3 flex gap-2">
          <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <Plus className="w-3.5 h-3.5 ml-1" />
                قناة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء قناة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>اسم القناة</Label>
                  <Input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="مثال: قسم التدقيق" className="mt-1" />
                </div>
                <div>
                  <Label>الوصف (اختياري)</Label>
                  <Input value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} placeholder="وصف مختصر للقناة" className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createChannel} className="bg-emerald-600 hover:bg-emerald-700">إنشاء</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={newDMOpen} onOpenChange={setNewDMOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-8 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <MessageCircle className="w-3.5 h-3.5 ml-1" />
                محادثة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>محادثة مباشرة جديدة</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="ابحث عن مستخدم..."
                value={dmSearch}
                onChange={(e) => searchUsers(e.target.value)}
                className="mb-3"
              />
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {usersList.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startDM(u.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--tarsul-hover)] text-right transition-colors"
                    >
                      <UserAvatar name={u.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.department || u.id}</p>
                      </div>
                      <StatusDot status={u.status} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Department Channels */}
        {departmentChannels.length > 0 && (
          <div className="px-3 mb-1">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              الأقسام والإدارات
            </p>
            {departmentChannels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group ${
                  activeChannelId === ch.id
                    ? 'bg-[var(--tarsul-active-bg)] text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-foreground/80 hover:bg-[var(--tarsul-hover)]'
                }`}
              >
                <span className="text-base flex-shrink-0">{ch.icon || '🏢'}</span>
                <div className="flex-1 min-w-0 text-right">
                  <span className="truncate block">{ch.name}</span>
                  {ch.description && (
                    <span className="text-[10px] text-muted-foreground truncate block">{ch.description}</span>
                  )}
                </div>
                {ch.memberCount && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{ch.memberCount}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Regular Channels */}
        {regularChannels.length > 0 && (
          <div className="px-3 mb-1">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              القنوات
            </p>
            {regularChannels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group ${
                  activeChannelId === ch.id
                    ? 'bg-[var(--tarsul-active-bg)] text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-foreground/80 hover:bg-[var(--tarsul-hover)]'
                }`}
              >
                <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1 text-right">{ch.name}</span>
              </button>
            ))}
          </div>
        )}

        <Separator className="mx-3 my-2" />

        {/* Direct Messages */}
        <div className="px-3">
          <button
            onClick={() => setShowDMs(!showDMs)}
            className="w-full flex items-center justify-between px-2 mb-1.5"
          >
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <MessageCircle className="w-3 h-3" />
              الرسائل المباشرة
            </p>
            <ChevronLeft className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${showDMs ? 'rotate-90' : ''}`} />
          </button>
          {showDMs && conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group ${
                activeConversationId === conv.id
                  ? 'bg-[var(--tarsul-active-bg)] text-emerald-700 dark:text-emerald-400 font-medium'
                  : 'text-foreground/80 hover:bg-[var(--tarsul-hover)]'
              }`}
            >
              <div className="relative flex-shrink-0">
                <UserAvatar name={conv.otherUser.name} />
                <span className="absolute -bottom-0.5 -left-0.5"><StatusDot status={conv.otherUser.status} /></span>
              </div>
              <span className="truncate flex-1 text-right">{conv.otherUser.name}</span>
            </button>
          ))}
        </div>

        <Separator className="mx-3 my-2" />

        {/* Team Members section */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowTeam(!showTeam)}
            className="w-full flex items-center justify-between px-2 mb-1.5"
          >
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              أعضاء الفريق — {teamMembers.length}
            </p>
            <ChevronLeft className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${showTeam ? 'rotate-90' : ''}`} />
          </button>
          {showTeam && (
            <div className="space-y-0.5">
              {teamMembers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setProfileUser(u); setProfileOpen(true); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 hover:bg-[var(--tarsul-hover)] text-right"
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar name={u.name} />
                    <span className="absolute -bottom-0.5 -left-0.5"><StatusDot status={u.status} /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-foreground/80 text-xs">{u.name}</span>
                    {u.department && (
                      <span className="text-[10px] text-muted-foreground truncate block">{u.department}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Footer */}
      {user && (
        <div className="p-3 border-t bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setProfileUser({ ...user, email: user.email }); setProfileOpen(true); }}
              className="relative focus:outline-none"
            >
              <UserAvatar name={user.name} size="md" />
              <span className="absolute -bottom-0.5 -left-0.5"><StatusDot status="online" /></span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{user.email}</p>
            </div>
            <div className="flex items-center gap-0.5">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem className="opacity-60 cursor-default">
                    <EncryptionBadge />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => useAuthStore.getState().logout()} className="text-red-600 dark:text-red-400">
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      <UserProfileDialog user={profileUser} open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileAttachment({ metadata }: { metadata: string | null; content: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (url: string, filename: string) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const filePath = url.startsWith('/') ? url : `/${url}`;
      const downloadUrl = `/api/download?file=${encodeURIComponent(filePath)}&name=${encodeURIComponent(filename)}`;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

      toast.success(`تم تنزيل "${filename}" بنجاح`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل تنزيل الملف، يرجى المحاولة مرة أخرى');
    } finally {
      setDownloading(false);
    }
  };

  if (!metadata) return null;
  let fileData: { fileType?: string; file?: { url: string; filename: string; originalName?: string; mimetype: string; size: number; category: string } } | null = null;
  try {
    fileData = JSON.parse(metadata);
  } catch {
    return null;
  }
  if (!fileData?.fileType || fileData.fileType !== 'attachment' || !fileData.file) return null;
  const { url, filename, originalName, size, category } = fileData.file;
  const displayName = originalName || filename;

  if (category === 'image') {
    return (
      <div className="mb-2 rounded-xl overflow-hidden border border-border max-w-[300px] shadow-sm" dir="rtl">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt={displayName}
            className="w-full max-h-56 object-contain bg-muted/30"
            loading="lazy"
          />
        </a>
        <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-md bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate" title={displayName}>{displayName}</p>
              <p className="text-[10px] text-muted-foreground">{formatFileSize(size)}</p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(url, displayName)}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex-shrink-0 mr-2"
          >
            {downloading ? (
              <>
                <DownloadLoader className="w-3.5 h-3.5 animate-spin" />
                <span>جارٍ التنزيل...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const isPdf = category === 'pdf';
  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-xl border mb-2 max-w-[320px] shadow-sm ${
        isPdf
          ? 'border-red-200/80 bg-gradient-to-l from-red-50/80 to-white dark:from-red-950/30 dark:to-card dark:border-red-800/50'
          : 'border-blue-200/80 bg-gradient-to-l from-blue-50/80 to-white dark:from-blue-950/30 dark:to-card dark:border-blue-800/50'
      }`}
      dir="rtl"
    >
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-sm ${
          isPdf
            ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/40'
            : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/40'
        }`}
        onClick={() => window.open(url, '_blank')}
        title="معاينة"
      >
        {isPdf ? (
          <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
        ) : (
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" title={displayName}>{displayName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{formatFileSize(size)}</p>
      </div>
      <button
        onClick={() => handleDownload(url, displayName)}
        disabled={downloading}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex-shrink-0"
        title={`تنزيل ${displayName}`}
      >
        {downloading ? (
          <>
            <DownloadLoader className="w-3.5 h-3.5 animate-spin" />
            <span>جارٍ التنزيل...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>تنزيل</span>
          </>
        )}
      </button>
    </div>
  );
}

// ========================
// Message Bubble
// ========================
function MessageBubble({
  msg, isOwn, onReply, onDelete, onPin, onProfileClick, displayContent, readStatus,
}: {
  msg: Message;
  isOwn: boolean;
  onReply: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onProfileClick: (user: Message['sender']) => void;
  /** Decrypted or plaintext content to display */
  displayContent: string;
  /** Read receipt status: 'sent' | 'delivered' | 'read' | null */
  readStatus: string | null;
}) {
  // System message
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
          {msg.content}
        </div>
      </div>
    );
  }

  // Decryption failed indicator
  const isEncrypted = msg.type === 'encrypted' && msg.iv;
  const isDecryptError = isEncrypted && displayContent === msg.content && displayContent.length > 100;

  return (
    <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''} mb-1 px-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors duration-150`}>
      {/* Avatar — clickable for profile */}
      <button
        onClick={() => onProfileClick(msg.sender)}
        className="flex-shrink-0 mt-1 focus:outline-none"
      >
        <UserAvatar name={msg.sender.name} />
      </button>
      <div className={`flex-1 max-w-[75%] ${isOwn ? 'text-left' : 'text-right'}`}>
        {/* Sender info */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-sm font-semibold text-foreground">{msg.sender.name}</span>
          {msg.sender.department && (
            <span className="text-[10px] text-muted-foreground">{msg.sender.department}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
          {msg.isPinned && (
            <Pin className="w-3 h-3 text-amber-500" />
          )}
          {msg.isEdited && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Edit3 className="w-2.5 h-2.5" /> مُعدّل
            </span>
          )}
        </div>

        {/* Reply reference */}
        {msg.replyTo && (
          <div className={`text-xs p-2 bg-muted rounded-lg border-r-2 border-emerald-400 dark:border-emerald-600 mb-1 ${isOwn ? 'text-left' : ''}`}>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">{msg.replyTo.sender.name}</span>
            <p className="text-muted-foreground truncate">{msg.replyTo.content}</p>
          </div>
        )}

        {/* Message content */}
        <div className={`relative inline-block rounded-2xl px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md ${
          isOwn
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-md'
            : 'bg-card border border-border text-foreground rounded-tl-md'
        }`}>
          {isDecryptError ? (
            <div className="flex items-center gap-2 text-xs opacity-70">
              <Shield className="w-3.5 h-3.5" />
              <span>فشل فك التشفير — المفاتيح غير متاحة</span>
            </div>
          ) : (
            <>
              <FileAttachment metadata={msg.metadata} content={displayContent} />
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{displayContent}</p>
            </>
          )}

          {/* E2EE lock icon — only on encrypted messages */}
          {isEncrypted && !isDecryptError && (
            <div className={`absolute ${isOwn ? 'left-2' : 'right-2'} top-1.5 opacity-40`}>
              <Lock className="w-3 h-3" />
            </div>
          )}

          {/* Message actions — visible on hover */}
          <div className={`absolute ${isOwn ? 'left-2' : 'right-2'} -bottom-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground bg-card dark:bg-gray-800 shadow-sm border border-border rounded" onClick={() => onReply(msg)}>
              <Reply className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground bg-card dark:bg-gray-800 shadow-sm border border-border rounded" onClick={() => onPin(msg)}>
              <Pin className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground bg-card dark:bg-gray-800 shadow-sm border border-border rounded" onClick={() => { navigator.clipboard.writeText(displayContent); toast.success('تم نسخ الرسالة'); }}>
              <Copy className="w-3 h-3" />
            </Button>
            {isOwn && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 bg-card dark:bg-gray-800 shadow-sm border border-border rounded" onClick={() => onDelete(msg)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Delivery / Read indicator */}
        {isOwn && (
          <div className={`flex items-center gap-0.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            {readStatus === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
            ) : readStatus === 'delivered' ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-[9px] text-muted-foreground">
              {readStatus === 'read' ? 'تمت القراءة' : readStatus === 'delivered' ? 'تم الاستلام' : 'تم الإرسال'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================
// Typing Indicator
// ========================
function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} و${names[1]}` : `${names[0]} و${names.length - 1} آخرون`;
  return (
    <div className="px-4 py-1.5 flex items-center gap-2" dir="rtl">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" style={{ animationDelay: '200ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-xs text-muted-foreground italic">{label} يكتب...</span>
    </div>
  );
}

// ========================
// Pinned Messages Bar
// ========================
function PinnedMessagesBar({ messages }: { messages: Message[] }) {
  const pinned = messages.filter((m) => m.isPinned && !m.isDeleted);
  if (pinned.length === 0) return null;
  const latest = pinned[pinned.length - 1];
  return (
    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-2" dir="rtl">
      <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">رسالة مثبتة</p>
        <p className="text-xs text-foreground truncate">{latest.content}</p>
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0">{pinned.length} رسائل مثبتة</span>
    </div>
  );
}

// ========================
// Chat Area
// ========================
function ChatArea({ onOpenUsersPanel, onOpenTweets }: { onOpenUsersPanel: () => void; onOpenTweets: () => void }) {
  const { messages, activeChannelId, activeConversationId, activeView, channels, conversations,
    loadingMessages, sendingMessage, setLoadingMessages, setSendingMessage, addMessage } = useChatStore();
  const { user, token } = useAuthStore();
  const { sendMessage, sendTyping, stopTyping, socket } = useSocket();
  const callHook = useCall();
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [profileUser, setProfileUser] = useState<ProfileUserData | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cryptoReady, setCryptoReady] = useState(false);
  // Call user selector
  const [callUserPickerOpen, setCallUserPickerOpen] = useState(false);
  // File upload
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<'audio' | 'video' | null>(null);
  const [callUsers, setCallUsers] = useState<Array<{ id: string; name: string; avatar?: string | null; status: string }>>([]);
  const [callUserSearch, setCallUserSearch] = useState('');
  // Map: messageId -> decrypted plaintext
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  // Map: messageId -> read status ('sent' | 'delivered' | 'read')
  const [readStatusMap, setReadStatusMap] = useState<Record<string, string>>({});
  // Track recently sent messages (plaintext) to avoid re-encryption display
  const sentPlaintextRef = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Initialize CryptoManager from localStorage keys (needed after page refresh)
  useEffect(() => {
    const init = async () => {
      try {
        const cm = CryptoManager.getInstance();
        if (!cm.isInitialized()) {
          await cm.initialize();
        }
        setCryptoReady(true);
      } catch (err) {
        console.warn('[Tarsul] Crypto init failed:', err);
        setCryptoReady(false);
      }
    };
    init();
  }, []);

  // Decrypt messages when they change or crypto becomes ready
  useEffect(() => {
    if (!cryptoReady || messages.length === 0) return;
    const cm = CryptoManager.getInstance();
    if (!cm.isInitialized()) return;

    const targetId = activeView === 'channels' ? activeChannelId : activeConversationId;
    if (!targetId) return;

    let cancelled = false;
    const decryptAll = async () => {
      const newMap: Record<string, string> = {};
      const newStatus: Record<string, string> = {};

      for (const msg of messages) {
        // System messages and non-encrypted messages: pass through
        if (msg.type === 'system' || !msg.iv) {
          newMap[msg.id] = msg.content;
          // Simulate read status for non-own messages
          if (msg.senderId !== user?.id) {
            newStatus[msg.id] = 'read';
          } else {
            newStatus[msg.id] = 'delivered';
          }
          continue;
        }

        // Check if we just sent this message (use the stored plaintext)
        if (sentPlaintextRef.current[msg.id]) {
          newMap[msg.id] = sentPlaintextRef.current[msg.id];
          newStatus[msg.id] = 'sent';
          continue;
        }

        // Try to decrypt encrypted messages
        try {
          let plaintext: string;
          if (activeView === 'channels') {
            plaintext = await cm.decryptChannelMessage(
              { content: msg.content, iv: msg.iv },
              msg.channelId || targetId
            );
          } else {
            // For DMs, try channel-style decryption with dmId as key
            plaintext = await cm.decryptChannelMessage(
              { content: msg.content, iv: msg.iv },
              msg.dmId || targetId
            );
          }
          newMap[msg.id] = plaintext;
          newStatus[msg.id] = msg.senderId === user?.id ? 'delivered' : 'read';
        } catch {
          // Decryption failed — keep raw content (will show error in bubble)
          newMap[msg.id] = msg.content;
          newStatus[msg.id] = 'sent';
        }
      }

      if (!cancelled) {
        setDecryptedMap(newMap);
        setReadStatusMap(newStatus);
      }
    };

    decryptAll();
    return () => { cancelled = true; };
  }, [messages, cryptoReady, activeView, activeChannelId, activeConversationId, user?.id]);

  // Helper: get display content for a message
  const getDisplayContent = useCallback((msg: Message): string => {
    if (msg.type === 'system' || !msg.iv) return msg.content;
    return decryptedMap[msg.id] || msg.content;
  }, [decryptedMap]);

  // Helper: get read status for a message
  const getReadStatus = useCallback((msg: Message): string | null => {
    if (msg.type === 'system') return null;
    return readStatusMap[msg.id] || null;
  }, [readStatusMap]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket.current) return;
    const onTyping = (data: { userId: string; userName: string }) => {
      if (data.userId === user?.id) return;
      setTypingUsers((prev) => {
        if (prev.includes(data.userName)) return prev;
        return [...prev, data.userName];
      });
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== data.userName));
      }, 3000);
    };
    const onStopTyping = (data: { userId: string; userName: string }) => {
      setTypingUsers((prev) => prev.filter((n) => n !== data.userName));
    };
    socket.current.on('user-typing', onTyping);
    socket.current.on('user-stop-typing', onStopTyping);
    return () => {
      socket.current?.off('user-typing', onTyping);
      socket.current?.off('user-stop-typing', onStopTyping);
    };
  }, [socket, user?.id]);

  // Listen for new messages from socket for toast notifications
  useEffect(() => {
    if (!socket.current) return;
    const handler = (message: any) => {
      // Decrypt content for toast preview
      let previewContent = message.content || '';
      if (message.iv && message.content?.length > 100) {
        previewContent = '🔐 رسالة مشفرة';
      }
      // If message is for a different channel/DM, show toast
      if (message.channelId && message.channelId !== activeChannelId) {
        const ch = channels.find((c) => c.id === message.channelId);
        toast.info(`${message.senderName || 'مستخدم'}: ${previewContent.slice(0, 60)}${previewContent.length > 60 ? '...' : ''}`, {
          description: ch ? `#${ch.name}` : 'قناة',
          action: {
            label: 'فتح',
            onClick: () => {
              useChatStore.getState().setActiveChannel(message.channelId);
            },
          },
        });
      } else if (message.dmId && message.dmId !== activeConversationId) {
        toast.info(`${message.senderName || 'مستخدم'}: ${previewContent.slice(0, 60)}${previewContent.length > 60 ? '...' : ''}`, {
          description: 'رسالة مباشرة',
          action: {
            label: 'فتح',
            onClick: () => {
              useChatStore.getState().setActiveConversation(message.dmId);
            },
          },
        });
      }
    };
    socket.current.on('new-message', handler);
    return () => { socket.current?.off('new-message', handler); };
  }, [socket, activeChannelId, activeConversationId, channels]);

  // Load messages when channel/DM changes
  useEffect(() => {
    if (!token || activeView === 'none') return;

    let url = '';
    if (activeView === 'channels' && activeChannelId) {
      url = `/api/channels/${activeChannelId}/messages`;
    } else if (activeView === 'dm' && activeConversationId) {
      url = `/api/dm/${activeConversationId}/messages`;
    }
    if (!url) return;

    setLoadingMessages(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) useChatStore.getState().setMessages(d.messages);
      })
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [token, activeView, activeChannelId, activeConversationId, setLoadingMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Send encrypted message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !token || sendingMessage) return;
    setSendingMessage(true);

    try {
      const cryptoManager = CryptoManager.getInstance();

      let encryptedContent = inputText;
      let iv = '';

      if (cryptoManager.isInitialized()) {
        let payload;
        if (activeView === 'channels' && activeChannelId) {
          payload = await cryptoManager.encryptForChannel(inputText, activeChannelId);
        } else {
          payload = await cryptoManager.encryptForChannel(inputText, activeConversationId || 'dm-default');
        }
        encryptedContent = payload.content;
        iv = payload.iv;
      }

      let apiUrl = '';
      let channelId: string | undefined;
      let dmId: string | undefined;

      if (activeView === 'channels' && activeChannelId) {
        apiUrl = `/api/channels/${activeChannelId}/messages`;
        channelId = activeChannelId;
      } else if (activeView === 'dm' && activeConversationId) {
        apiUrl = `/api/dm/${activeConversationId}/messages`;
        dmId = activeConversationId;
      }

      if (!apiUrl) return;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: encryptedContent,
          iv,
          type: 'encrypted',
          replyToId: replyTo?.id || null,
        }),
      });

      const data = await res.json();

      if (data.message) {
        // Store plaintext for immediate display (before encryption cycle)
        sentPlaintextRef.current[data.message.id] = inputText;

        // Add message directly from API response (no socket echo needed for sender)
        useChatStore.getState().addMessage(data.message);

        // Broadcast to OTHER clients via socket (chat-service uses socket.broadcast.emit)
        sendMessage({
          ...data.message,
          senderName: user?.name || '',
          senderAvatar: user?.avatar || null,
          senderRole: user?.role || '',
          senderDepartment: user?.department || '',
        });

        stopTyping(channelId ? { channelId } : { dmId });
      }

      setInputText('');
      setReplyTo(null);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSendingMessage(false);
    }
  }, [inputText, token, activeView, activeChannelId, activeConversationId, sendingMessage, replyTo, user, sendMessage, stopTyping]);

  // Send file message
  const handleFileSelected = useCallback(async (fileInfo: UploadedFile) => {
    if (!token || sendingMessage) return;
    setSendingMessage(true);

    try {
      let apiUrl = '';
      if (activeView === 'channels' && activeChannelId) {
        apiUrl = `/api/channels/${activeChannelId}/messages`;
      } else if (activeView === 'dm' && activeConversationId) {
        apiUrl = `/api/dm/${activeConversationId}/messages`;
      }
      if (!apiUrl) return;

      const fileLabel = fileInfo.category === 'image'
        ? '📷 صورة'
        : fileInfo.category === 'pdf'
          ? '📄 ملف PDF'
          : '📝 مستند Word';

      const caption = `${fileLabel}: ${fileInfo.originalName}`;
      const metadata = JSON.stringify({
        fileType: 'attachment',
        file: {
          url: fileInfo.url,
          filename: fileInfo.originalName,
          mimetype: fileInfo.mimetype,
          size: fileInfo.size,
          category: fileInfo.category,
        },
      });

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: caption,
          type: 'file',
          metadata,
          replyToId: replyTo?.id || null,
        }),
      });

      const data = await res.json();
      if (data.message) {
        sentPlaintextRef.current[data.message.id] = caption;
        useChatStore.getState().addMessage(data.message);
        sendMessage({
          ...data.message,
          senderName: user?.name || '',
          senderAvatar: user?.avatar || null,
          senderRole: user?.role || '',
          senderDepartment: user?.department || '',
        });
      }

      toast.success(`تم إرسال ${fileInfo.originalName}`);
    } catch (err) {
      console.error('File send error:', err);
      toast.error('فشل إرسال الملف');
    } finally {
      setSendingMessage(false);
    }
  }, [token, activeView, activeChannelId, activeConversationId, sendingMessage, replyTo, user, sendMessage]);

  // Typing indicator
  const handleTyping = () => {
    if (activeView === 'channels' && activeChannelId) {
      sendTyping({ channelId: activeChannelId });
    } else if (activeView === 'dm' && activeConversationId) {
      sendTyping({ dmId: activeConversationId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeView === 'channels' && activeChannelId) {
        stopTyping({ channelId: activeChannelId });
      } else if (activeView === 'dm' && activeConversationId) {
        stopTyping({ dmId: activeConversationId });
      }
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!token || !activeChannelId) return;
    try {
      await fetch(`/api/channels/${activeChannelId}/messages/${msg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      useChatStore.getState().setMessages(messages.map((m) => m.id === msg.id ? { ...m, isDeleted: true, content: 'تم حذف هذه الرسالة' } : m));
      toast.success('تم حذف الرسالة');
    } catch {
      toast.error('فشل في حذف الرسالة');
    }
  };

  const handlePinMessage = async (msg: Message) => {
    if (!token || !activeChannelId) return;
    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages/${msg.id}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.message) {
        useChatStore.getState().setMessages(messages.map((m) => m.id === msg.id ? { ...m, isPinned: data.message.isPinned } : m));
        toast.success(data.message.isPinned ? 'تم تثبيت الرسالة' : 'تم إلغاء التثبيت');
      }
    } catch {
      toast.error('فشل في تثبيت الرسالة');
    }
  };

  const handleProfileClick = (sender: Message['sender']) => {
    setProfileUser({
      id: sender.id,
      name: sender.name,
      department: sender.department || null,
      role: sender.role,
    });
    setProfileOpen(true);
  };

  // ---- Call helpers ----
  const handleCallClick = (type: 'audio' | 'video') => {
    // For DM conversations, start call directly with the other user
    if (activeView === 'dm' && activeConversation) {
      const otherUser = activeConversation.otherUser;
      callHook.startCall(
        { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar },
        type,
      );
      return;
    }
    // For channels, show user picker
    setPendingCallType(type);
    setCallUserSearch('');
    if (token) {
      fetch('/api/users?excludeSelf=true', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.users) setCallUsers(d.users); })
        .catch(console.error);
    }
    setCallUserPickerOpen(true);
  };

  const initiateCallWithUser = (targetUser: { id: string; name: string; avatar?: string | null }) => {
    if (pendingCallType) {
      callHook.startCall(targetUser, pendingCallType);
    }
    setCallUserPickerOpen(false);
    setPendingCallType(null);
  };

  const filteredCallUsers = callUsers.filter((u) =>
    u.name.includes(callUserSearch) || (u.id && u.id.includes(callUserSearch)),
  );

  // Render date separators between messages
  const renderMessages = () => {
    const result: React.ReactNode[] = [];
    let lastDate = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!isSameDay(msg.createdAt, lastDate)) {
        lastDate = msg.createdAt;
        result.push(
          <div key={`sep-${msg.id}`} className="flex items-center gap-3 my-4 px-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium bg-[var(--tarsul-chat-bg)] px-3 py-1 rounded-full border border-border">
              {getDateSeparator(msg.createdAt)}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        );
      }
      result.push(
        <MessageBubble
          key={msg.id}
          msg={msg}
          isOwn={msg.senderId === user?.id}
          onReply={setReplyTo}
          onDelete={handleDeleteMessage}
          onPin={handlePinMessage}
          onProfileClick={handleProfileClick}
          displayContent={getDisplayContent(msg)}
          readStatus={getReadStatus(msg)}
        />
      );
    }
    return result;
  };

  // Empty state with animated illustration
  if (activeView === 'none') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--tarsul-chat-bg)]" dir="rtl">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="mx-auto w-28 h-28 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-3xl flex items-center justify-center animate-float">
            <Shield className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">مرحباً بك في تراسل</h2>
            <p className="text-muted-foreground leading-relaxed">اختر قناة أو محادثة مباشرة من القائمة الجانبية للبدء في المراسلة المشفرة.</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-500" />
              <span>RSA-OAEP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>E2EE</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--tarsul-chat-bg)]">
      {/* Channel/DM Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-[var(--tarsul-header-bg)]" dir="rtl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => useChatStore.getState().toggleSidebar()} className="lg:hidden text-muted-foreground h-8 w-8">
            <Menu className="w-5 h-5" />
          </Button>
          {activeView === 'channels' && activeChannel && (
            <>
              <span className="text-xl">{activeChannel.icon || '#'}</span>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{activeChannel.name}</h3>
                {activeChannel.description && (
                  <p className="text-[11px] text-muted-foreground">{activeChannel.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 mr-2">
                <Users className="w-3 h-3 ml-1" />
                {activeChannel.memberCount || 0} عضو
              </Badge>
            </>
          )}
          {activeView === 'dm' && activeConversation && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <UserAvatar name={activeConversation.otherUser.name} size="md" />
                <span className="absolute -bottom-0.5 -left-0.5">
                  <StatusDot status={activeConversation.otherUser.status} />
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{activeConversation.otherUser.name}</h3>
                <p className="text-[11px] text-muted-foreground">{activeConversation.otherUser.department || 'متصل الآن'}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <EncryptionBadge />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={onOpenTweets}>
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">تغريدات المؤسسة</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={onOpenUsersPanel}>
                  <PanelRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">قائمة الأعضاء</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 h-8 w-8" onClick={() => handleCallClick('audio')}>
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 h-8 w-8" onClick={() => handleCallClick('video')}>
            <Video className="w-4 h-4" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                  <Search className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">بحث في الرسائل</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Pinned messages bar */}
      <PinnedMessagesBar messages={messages} />

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-muted border-b flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-muted-foreground">رد على:</span>
            <span className="font-medium text-foreground">{replyTo.sender.name}</span>
            <span className="text-muted-foreground truncate max-w-[200px]">— {getDisplayContent(replyTo)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm" dir="rtl">
            <div className="text-center">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-300 dark:text-emerald-700" />
              <p className="font-medium">لا توجد رسائل بعد</p>
              <p className="text-xs mt-1">أرسل أول رسالة مشفرة! 🔐</p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {renderMessages()}
            <div ref={messagesEndRef} />
          </div>
        )}
        <TypingIndicator names={typingUsers} />
      </div>

      {/* Message Input */}
      <div className="border-t p-3 bg-card" dir="rtl">
        <div className="message-input-glow flex items-center gap-2 bg-[var(--tarsul-input-bg)] rounded-xl border border-border px-3 py-1.5">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 h-8 w-8 flex-shrink-0" onClick={() => setFileUploadOpen(true)}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            ref={inputRef}
            value={inputText}
            onChange={(e) => { setInputText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالة مشفرة..."
            className="border-0 bg-transparent focus-visible:ring-0 h-9 text-sm px-1 text-foreground placeholder:text-muted-foreground"
            disabled={sendingMessage}
          />
          <div className="flex items-center gap-0.5 flex-shrink-0 relative">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
              <AtSign className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              <Smile className="w-4 h-4" />
            </Button>
            {showEmoji && (
              <EmojiPicker
                onSelect={(emoji) => setInputText((prev) => prev + emoji)}
                onClose={() => setShowEmoji(false)}
              />
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
              <Mic className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || sendingMessage}
              className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex-shrink-0 disabled:opacity-40"
              size="icon"
            >
              {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            <span>الرسالة ستكون مشفرة من الطرف إلى الطرف</span>
          </div>
          <div className="flex items-center gap-2">
            {inputText.length > 500 && (
              <span className={`text-[10px] ${inputText.length > 2000 ? 'text-red-500' : 'text-amber-500'}`}>
                {inputText.length} / 2000
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              <KeyRound className="w-3 h-3 inline" /> AES-256-GCM
            </span>
          </div>
        </div>
      </div>

      <UserProfileDialog user={profileUser} open={profileOpen} onOpenChange={setProfileOpen} />

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={fileUploadOpen}
        onOpenChange={setFileUploadOpen}
        onFileSelected={handleFileSelected}
        token={token || ''}
      />

      {/* Call overlays */}
      <CallDialog
        target={callHook.callState === 'ringing' || callHook.callState === 'connecting' ? callHook.callTarget : null}
        callType={callHook.callType}
        onCancel={callHook.hangUp}
      />
      <IncomingCallDialog
        caller={callHook.incomingCall}
        onAccept={callHook.answerCall}
        onReject={callHook.rejectCall}
      />
      <ActiveCallScreen
        target={callHook.callState === 'active' || callHook.callState === 'connecting' ? callHook.callTarget : null}
        callType={callHook.callType}
        duration={callHook.callDuration}
        isMuted={callHook.isMuted}
        isVideoOff={callHook.isVideoOff}
        remoteStream={callHook.remoteStream}
        localStream={callHook.localStream}
        onToggleMute={callHook.toggleMute}
        onToggleVideo={callHook.toggleVideo}
        onHangUp={callHook.hangUp}
      />

      {/* Call user picker dialog (for channel calls) */}
      <Dialog open={callUserPickerOpen} onOpenChange={setCallUserPickerOpen}>
        <DialogContent dir="rtl" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingCallType === 'video' ? <Video className="w-5 h-5 text-emerald-600" /> : <Phone className="w-5 h-5 text-emerald-600" />}
              اختر مستخدماً للمكالمة
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="ابحث عن مستخدم..."
            value={callUserSearch}
            onChange={(e) => setCallUserSearch(e.target.value)}
            className="mb-3"
          />
          <ScrollArea className="max-h-64">
            <div className="space-y-1">
              {filteredCallUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مستخدمين</p>
              )}
              {filteredCallUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => initiateCallWithUser({ id: u.id, name: u.name, avatar: u.avatar })}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-right transition-colors group"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm">
                      {u.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.status === 'online' ? 'متصل' : 'غير متصل'}</p>
                  </div>
                  <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {pendingCallType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========================
// Main Chat Layout
// ========================
export default function ChatLayout() {
  const [usersPanelOpen, setUsersPanelOpen] = useState(false);
  const [tweetsPanelOpen, setTweetsPanelOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      <ChannelSidebar />
      <ChatArea
        onOpenUsersPanel={() => { setUsersPanelOpen(true); setTweetsPanelOpen(false); }}
        onOpenTweets={() => { setTweetsPanelOpen(true); setUsersPanelOpen(false); }}
      />
      <OnlineUsersPanel open={usersPanelOpen && !tweetsPanelOpen} onClose={() => setUsersPanelOpen(false)} />
      <TweetsPanel open={tweetsPanelOpen} onClose={() => setTweetsPanelOpen(false)} />
    </div>
  );
}