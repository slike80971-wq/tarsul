'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, UserX, Clock, MessageSquare, FolderOpen,
  Hash, Mail, Phone, Search, Plus, Pencil, Ban, Trash2,
  CheckCircle, XCircle, BarChart3, TrendingUp, Shield, UsersRound,
  Loader2, RefreshCw, UserPlus, UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogTitle, DialogHeader,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAppState, setState, type User as UserType } from '@/components/chat';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminUser extends UserType {
  approvalStatus?: string;
  isBlocked?: boolean;
  createdAt?: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  pendingApprovals: number;
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  groupConversations: number;
  totalChannels: number;
  totalMessages: number;
  totalDirectMessages: number;
  totalChannelMessages: number;
  recentMessages: number;
  voiceCalls: number;
  usersByRole: { role: string; count: number }[];
  conversationsByStatus: { status: string; count: number }[];
  messagesPerDay: { date: string; count: number }[];
  topUsers: { name: string; messages: number }[];
}

interface ChannelItem {
  id: string;
  name: string;
  description?: string;
  isLocked?: boolean;
  members: { user: { id: string; name: string; status: string } }[];
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationItem {
  id: string;
  name?: string;
  type: string;
  status: string;
  members: { user: { id: string; name: string; status: string } }[];
  messages: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    status: string;
    email: string;
    role: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminDashboard() {
  const state = useAppState();

  /* ---- Local state ---- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  /* Dialogs */
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  /* Channel member management */
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [managingChannel, setManagingChannel] = useState<ChannelItem | null>(null);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  /* Form fields */
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('مستخدم');
  const [formGroupName, setFormGroupName] = useState('');
  const [formChannelName, setFormChannelName] = useState('');
  const [formChannelDesc, setFormChannelDesc] = useState('');
  const [formChannelLocked, setFormChannelLocked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* ---- Data fetching ---- */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch { /* silent */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch { /* silent */ }
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/approvals');
      const data = await res.json();
      if (data.users) setPendingUsers(data.users);
    } catch { /* silent */ }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (data.channels) setChannels(data.channels);
    } catch { /* silent */ }
  }, []);

  const currentUserId = state.currentUser?.id || '';

  const fetchConversations = useCallback(async (userId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        headers: { 'x-user-id': userId },
      });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()).then(d => { if (!cancelled && d.stats) setStats(d.stats); }).catch(() => {}),
        fetch('/api/admin/users').then(r => r.json()).then(d => { if (!cancelled && d.users) setUsers(d.users); }).catch(() => {}),
        fetch('/api/admin/approvals').then(r => r.json()).then(d => { if (!cancelled && d.users) setPendingUsers(d.users); }).catch(() => {}),
        fetch('/api/channels').then(r => r.json()).then(d => { if (!cancelled && d.channels) setChannels(d.channels); }).catch(() => {}),
        fetchConversations(currentUserId),
      ]);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [currentUserId, fetchConversations]);

  /* ---- Handlers ---- */
  const handleCreateUser = async () => {
    if (!formName || !formEmail || !formPassword) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
      });
      if (res.ok) {
        setShowAddUser(false);
        setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('مستخدم');
        fetchUsers(); fetchStats();
      }
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: formName,
          email: formEmail,
          role: formRole,
        }),
      });
      if (res.ok) {
        setShowEditUser(false);
        setEditingUser(null);
        fetchUsers(); fetchStats();
      }
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setShowEditUser(true);
  };

  const handleUserAction = async (userId: string, action: 'block' | 'unblock' | 'delete') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchUsers(); fetchStats();
      }
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/approvals/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchApprovals(); fetchUsers(); fetchStats();
      }
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const handleCreateChannel = async () => {
    if (!formChannelName) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formChannelName,
          description: formChannelDesc,
          createdBy: state.currentUser?.id,
          isLocked: formChannelLocked,
        }),
      });
      if (res.ok) {
        setShowCreateChannel(false);
        setFormChannelName(''); setFormChannelDesc(''); setFormChannelLocked(false);
        fetchChannels(); fetchStats();
      }
    } catch { /* silent */ }
    setActionLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!formGroupName) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': state.currentUser?.id || '' },
        body: JSON.stringify({
          name: formGroupName,
          type: 'مجموعة',
          memberIds: [],
        }),
      });
      if (res.ok) {
        setShowCreateGroup(false);
        setFormGroupName('');
        fetchConversations(state.currentUser?.id || ''); fetchStats();
      }
    } catch { /* silent */ }
    setActionLoading(false);
  };

  /* ---- Channel member management ---- */
  const openManageMembers = async (channel: ChannelItem) => {
    setManagingChannel(channel);
    setShowManageMembers(true);
    setMemberSearch('');
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/members`);
      const data = await res.json();
      if (data.members) {
        setChannelMembers(data.members);
      }
    } catch {
      setChannelMembers([]);
    }
    setMembersLoading(false);
  };

  const handleAddMember = async (userId: string) => {
    if (!managingChannel) return;
    try {
      const res = await fetch(`/api/channels/${managingChannel.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.member) {
          setChannelMembers(prev => [...prev, data.member]);
        }
        fetchChannels();
      }
    } catch { /* silent */ }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!managingChannel) return;
    try {
      const res = await fetch(`/api/channels/${managingChannel.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChannelMembers(prev => prev.filter(m => m.userId !== userId));
        fetchChannels();
      }
    } catch { /* silent */ }
  };

  const closeManageMembers = () => {
    setShowManageMembers(false);
    setManagingChannel(null);
    setChannelMembers([]);
    setMemberSearch('');
  };

  /* ---- Available users not in channel ---- */
  const availableUsers = users.filter(
    u => !channelMembers.some(m => m.userId === u.id)
  ).filter(u =>
    !memberSearch ||
    u.name.includes(memberSearch) ||
    u.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  /* ---- Filtered users ---- */
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.includes(userSearch) || u.email.includes(userSearch);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  /* ---- Arabic day name helper ---- */
  const getArDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
  };

  /* ---- Max bar value for chart ---- */
  const maxMsgDay = stats?.messagesPerDay?.length
    ? Math.max(...stats.messagesPerDay.map(d => d.count), 1)
    : 1;

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1E3A8A] animate-spin" />
          <p className="text-sm text-gray-500">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white" dir="rtl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-l from-[#1E3A8A] to-[#1E3A8A]/95">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">لوحة تحكم المسؤول</h2>
            <p className="text-[11px] text-blue-200">إدارة شاملة للتطبيق</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-200 hover:text-white hover:bg-white/10"
          onClick={() => setState({ currentView: 'chats' })}
        >
          العودة
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========== Statistics Panel ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-5 h-5" />} value={stats?.totalUsers ?? 0} label="إجمالي المستخدمين" color="bg-[#1E3A8A]/10 text-[#1E3A8A]" />
          <StatCard icon={<UserCheck className="w-5 h-5" />} value={stats?.activeUsers ?? 0} label="المستخدمون النشطون" color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={<UserX className="w-5 h-5" />} value={stats?.blockedUsers ?? 0} label="المستخدمون المحظورون" color="bg-red-50 text-red-600" />
          <StatCard icon={<Clock className="w-5 h-5" />} value={stats?.pendingApprovals ?? 0} label="طلبات الموافقة" color="bg-amber-50 text-amber-600" />
          <StatCard icon={<MessageSquare className="w-5 h-5" />} value={stats?.totalConversations ?? 0} label="إجمالي المحادثات" color="bg-purple-50 text-purple-600" />
          <StatCard icon={<FolderOpen className="w-5 h-5" />} value={stats?.openConversations ?? 0} label="محادثات مفتوحة" color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={<Hash className="w-5 h-5" />} value={stats?.totalChannels ?? 0} label="القنوات" color="bg-[#1E3A8A]/10 text-[#1E3A8A]" />
          <StatCard icon={<Mail className="w-5 h-5" />} value={stats?.totalMessages ?? 0} label="إجمالي الرسائل" color="bg-blue-50 text-blue-600" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} value={stats?.recentMessages ?? 0} label="رسائل اليوم" color="bg-teal-50 text-teal-600" />
          <StatCard icon={<Phone className="w-5 h-5" />} value={stats?.voiceCalls ?? 0} label="مكالمات صوتية" color="bg-indigo-50 text-indigo-600" />
        </div>

        {/* ========== Tabs ========== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-gray-100 p-1">
            <TabsTrigger value="users" className="flex-1 min-w-[140px] text-xs sm:text-sm">
              <Users className="w-4 h-4 ml-1" />
              إدارة المستخدمين
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex-1 min-w-[140px] text-xs sm:text-sm">
              <Clock className="w-4 h-4 ml-1" />
              طلبات الموافقة
              {pendingUsers.length > 0 && (
                <Badge className="mr-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex-1 min-w-[140px] text-xs sm:text-sm">
              <UsersRound className="w-4 h-4 ml-1" />
              إدارة المجموعات
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 min-w-[140px] text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 ml-1" />
              إحصائيات متقدمة
            </TabsTrigger>
          </TabsList>

          {/* ========== User Management Tab ========== */}
          <TabsContent value="users" className="mt-4 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالاسم أو البريد..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="pr-9 h-9 text-sm"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                    <SelectValue placeholder="الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأدوار</SelectItem>
                    <SelectItem value="مسؤول">مسؤول</SelectItem>
                    <SelectItem value="مستخدم">مستخدم</SelectItem>
                    <SelectItem value="مشرف">مشرف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => { setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('مستخدم'); setShowAddUser(true); }}
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white h-9 text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 ml-1" />
                إضافة مستخدم
              </Button>
            </div>

            {/* Users Table */}
            <Card className="py-0 gap-0 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 z-10">
                    <TableRow>
                      <TableHead className="text-right text-xs font-semibold text-gray-600">الاسم</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-gray-600 hidden md:table-cell">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-gray-600">الدور</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-gray-600">الحالة</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-gray-600 hidden sm:table-cell">الموافقة</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-gray-600">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                          لا يوجد مستخدمون مطابقون
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {user.name?.charAt(0) || '?'}
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-gray-500 truncate max-w-[160px] block">{user.email}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.role === 'مسؤول'
                                  ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20'
                                  : user.role === 'مشرف'
                                    ? 'bg-purple-50 text-purple-600 border-purple-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                              }
                              variant="outline"
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                user.status === 'متصل' ? 'bg-emerald-500' :
                                user.status === 'متاح' ? 'bg-amber-500' : 'bg-gray-300'
                              }`} />
                              <span className="text-xs text-gray-600">{user.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              className={
                                (user as AdminUser).approvalStatus === 'approved'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : (user as AdminUser).approvalStatus === 'pending'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : 'bg-red-50 text-red-600 border-red-200'
                              }
                              variant="outline"
                            >
                              {(user as AdminUser).approvalStatus === 'approved' ? 'مقبول' :
                               (user as AdminUser).approvalStatus === 'pending' ? 'معلّق' : 'مرفوض'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-500 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                                onClick={() => openEditDialog(user as AdminUser)}
                                title="تعديل"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {(user as AdminUser).isBlocked ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => handleUserAction(user.id, 'unblock')}
                                  disabled={actionLoading}
                                  title="إلغاء الحظر"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                                  onClick={() => handleUserAction(user.id, 'block')}
                                  disabled={actionLoading}
                                  title="حظر"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleUserAction(user.id, 'delete')}
                                disabled={actionLoading}
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
            <p className="text-xs text-gray-400 text-center">
              عرض {filteredUsers.length} من أصل {users.length} مستخدم
            </p>
          </TabsContent>

          {/* ========== Approval Requests Tab ========== */}
          <TabsContent value="approvals" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">طلبات الموافقة المعلّقة</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={fetchApprovals}
              >
                <RefreshCw className="w-4 h-4 ml-1" />
                تحديث
              </Button>
            </div>

            {pendingUsers.length === 0 ? (
              <Card className="py-0 gap-0">
                <CardContent className="py-12 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-500">لا توجد طلبات موافقة معلّقة</p>
                  <p className="text-xs text-gray-400">جميع المستخدمين تمت الموافقة عليهم</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {pendingUsers.map(user => (
                  <Card key={user.id} className="py-0 gap-0">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3"
                          onClick={() => handleApproval(user.id, 'approve')}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="w-3.5 h-3.5 ml-1" />
                          قبول
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs px-3"
                          onClick={() => handleApproval(user.id, 'reject')}
                          disabled={actionLoading}
                        >
                          <XCircle className="w-3.5 h-3.5 ml-1" />
                          رفض
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== Group Management Tab ========== */}
          <TabsContent value="groups" className="mt-4 space-y-4">
            {/* Channels section */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#1E3A8A]" />
                القنوات ({channels.length})
              </h3>
              <Button
                onClick={() => { setFormChannelName(''); setFormChannelDesc(''); setFormChannelLocked(false); setShowCreateChannel(true); }}
                className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                إنشاء قناة
              </Button>
            </div>

            <div className="grid gap-2">
              {channels.length === 0 ? (
                <Card className="py-0 gap-0">
                  <CardContent className="py-8 text-center text-sm text-gray-400">لا توجد قنوات</CardContent>
                </Card>
              ) : (
                channels.map(ch => (
                  <Card key={ch.id} className="py-0 gap-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                            <Hash className="w-4 h-4 text-[#1E3A8A]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{ch.name}</p>
                              {ch.isLocked && (
                                <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0" variant="outline">
                                  مقفلة
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{ch.description || 'بدون وصف'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-left">
                            <p className="text-xs text-gray-500">
                              <span className="font-semibold text-gray-700">{ch.members?.length ?? 0}</span> عضو
                            </p>
                            <p className="text-xs text-gray-400">
                              <span className="font-semibold text-gray-600">{ch.messages?.length ?? 0}</span> رسالة
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                            onClick={() => openManageMembers(ch)}
                            title="إدارة الأعضاء"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Conversations (groups) section */}
            <div className="flex items-center justify-between mt-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-purple-600" />
                المحادثات الجماعية ({conversations.filter(c => c.type === 'مجموعة').length})
              </h3>
              <Button
                onClick={() => { setFormGroupName(''); setShowCreateGroup(true); }}
                className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                إنشاء مجموعة
              </Button>
            </div>

            <div className="grid gap-2">
              {conversations.filter(c => c.type === 'مجموعة').length === 0 ? (
                <Card className="py-0 gap-0">
                  <CardContent className="py-8 text-center text-sm text-gray-400">لا توجد محادثات جماعية</CardContent>
                </Card>
              ) : (
                conversations.filter(c => c.type === 'مجموعة').map(conv => (
                  <Card key={conv.id} className="py-0 gap-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                            <UsersRound className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{conv.name || 'محادثة جماعية'}</p>
                            <p className="text-xs text-gray-400">
                              {conv.members?.length ?? 0} عضو
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge
                            className={
                              conv.status === 'مفتوحة'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }
                            variant="outline"
                          >
                            {conv.status}
                          </Badge>
                          <p className="text-xs text-gray-400">
                            {conv.messages?.length ?? 0} رسالة
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* All conversations summary */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                جميع المحادثات ({conversations.length})
              </h3>
              <Card className="py-0 gap-0 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow>
                        <TableHead className="text-right text-xs font-semibold text-gray-600">الاسم</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600">النوع</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600">الحالة</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600">الأعضاء</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600">الرسائل</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                            لا توجد محادثات
                          </TableCell>
                        </TableRow>
                      ) : (
                        conversations.map(conv => (
                          <TableRow key={conv.id}>
                            <TableCell className="text-sm font-medium text-gray-900">
                              {conv.name || 'محادثة خاصة'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  conv.type === 'مجموعة'
                                    ? 'bg-purple-50 text-purple-600 border-purple-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }
                                variant="outline"
                              >
                                {conv.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  conv.status === 'مفتوحة'
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    : conv.status === 'مكتملة'
                                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                                      : 'bg-gray-100 text-gray-500 border-gray-200'
                                }
                                variant="outline"
                              >
                                {conv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600">{conv.members?.length ?? 0}</TableCell>
                            <TableCell className="text-xs text-gray-600">{conv.messages?.length ?? 0}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ========== Advanced Statistics Tab ========== */}
          <TabsContent value="stats" className="mt-4 space-y-4">
            {/* Messages per day chart */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1E3A8A]" />
                  الرسائل خلال آخر 7 أيام
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="flex items-end gap-2 h-40" dir="rtl">
                  {stats?.messagesPerDay && stats.messagesPerDay.length > 0 ? (
                    stats.messagesPerDay.map((day, i) => {
                      const height = Math.max((day.count / maxMsgDay) * 100, 4);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-gray-700">{day.count}</span>
                          <div
                            className="w-full bg-gradient-to-t from-[#1E3A8A] to-[#1E3A8A]/60 rounded-t-md transition-all duration-500 min-h-[4px]"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-[10px] text-gray-400 leading-tight text-center">
                            {getArDay(day.date)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-sm text-gray-400">لا توجد بيانات</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Active Users */}
              <Card className="py-0 gap-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    أكثر المستخدمين نشاطاً
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-4 space-y-2">
                  {stats?.topUsers && stats.topUsers.length > 0 ? (
                    stats.topUsers.map((u, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-sm text-gray-700 flex-1 truncate">{u.name}</span>
                        <span className="text-xs text-gray-400 font-medium">{u.messages} رسالة</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>

              {/* Users by Role */}
              <Card className="py-0 gap-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#1E3A8A]" />
                    المستخدمون حسب الدور
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-4 space-y-2.5">
                  {stats?.usersByRole && stats.usersByRole.length > 0 ? (
                    stats.usersByRole.map((r, i) => {
                      const total = stats.usersByRole.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                      const colors = [
                        'bg-[#1E3A8A]',
                        'bg-purple-500',
                        'bg-teal-500',
                        'bg-amber-500',
                        'bg-rose-500',
                      ];
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{r.role}</span>
                            <span className="text-xs text-gray-400">{r.count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Conversations by Status */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  المحادثات حسب الحالة
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats?.conversationsByStatus && stats.conversationsByStatus.length > 0 ? (
                    stats.conversationsByStatus.map((c, i) => {
                      const colorMap: Record<string, string> = {
                        'مفتوحة': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        'مغلقة': 'bg-red-50 text-red-700 border-red-200',
                        'مكتملة': 'bg-blue-50 text-blue-700 border-blue-200',
                        'جديدة': 'bg-amber-50 text-amber-700 border-amber-200',
                      };
                      const cls = colorMap[c.status] || 'bg-gray-50 text-gray-700 border-gray-200';
                      return (
                        <div key={i} className={`rounded-lg border p-3 text-center ${cls}`}>
                          <p className="text-xl font-bold">{c.count}</p>
                          <p className="text-xs mt-0.5">{c.status}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-4 text-center py-4 text-sm text-gray-400">
                      لا توجد بيانات
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message type breakdown */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  تفصيل الرسائل
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#1E3A8A]/5 border border-[#1E3A8A]/10 p-3 text-center">
                    <p className="text-xl font-bold text-[#1E3A8A]">{stats?.totalDirectMessages ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">رسائل مباشرة</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-center">
                    <p className="text-xl font-bold text-purple-600">{stats?.totalChannelMessages ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">رسائل القنوات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ========== Add User Dialog ========== */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">إضافة مستخدم جديد</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">أدخل بيانات المستخدم الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">الاسم الكامل</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="أدخل الاسم" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">البريد الإلكتروني</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="example@email.com" className="h-9 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">كلمة المرور</Label>
              <Input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="كلمة المرور" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الدور</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="مستخدم">مستخدم</SelectItem>
                  <SelectItem value="مشرف">مشرف</SelectItem>
                  <SelectItem value="مسؤول">مسؤول</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" className="text-sm h-9" onClick={() => setShowAddUser(false)}>إلغاء</Button>
            <Button
              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm h-9"
              onClick={handleCreateUser}
              disabled={!formName || !formEmail || !formPassword || actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Edit User Dialog ========== */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">قم بتعديل بيانات المستخدم</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">الاسم الكامل</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="أدخل الاسم" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">البريد الإلكتروني</Label>
              <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="example@email.com" className="h-9 text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الدور</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="مستخدم">مستخدم</SelectItem>
                  <SelectItem value="مشرف">مشرف</SelectItem>
                  <SelectItem value="مسؤول">مسؤول</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" className="text-sm h-9" onClick={() => setShowEditUser(false)}>إلغاء</Button>
            <Button
              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm h-9"
              onClick={handleUpdateUser}
              disabled={!formName || !formEmail || actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Create Channel Dialog ========== */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">إنشاء قناة جديدة</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">أدخل بيانات القناة الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم القناة</Label>
              <Input value={formChannelName} onChange={e => setFormChannelName(e.target.value)} placeholder="أدخل اسم القناة" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الوصف (اختياري)</Label>
              <Input value={formChannelDesc} onChange={e => setFormChannelDesc(e.target.value)} placeholder="وصف مختصر للقناة" className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="locked"
                checked={formChannelLocked}
                onChange={e => setFormChannelLocked(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="locked" className="text-xs cursor-pointer">قناة مقفلة</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" className="text-sm h-9" onClick={() => setShowCreateChannel(false)}>إلغاء</Button>
            <Button
              className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-sm h-9"
              onClick={handleCreateChannel}
              disabled={!formChannelName || actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Create Group Dialog ========== */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">إنشاء مجموعة جديدة</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">أدخل اسم المجموعة الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم المجموعة</Label>
              <Input value={formGroupName} onChange={e => setFormGroupName(e.target.value)} placeholder="أدخل اسم المجموعة" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" className="text-sm h-9" onClick={() => setShowCreateGroup(false)}>إلغاء</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-9"
              onClick={handleCreateGroup}
              disabled={!formGroupName || actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Manage Channel Members Dialog ========== */}
      <Dialog open={showManageMembers} onOpenChange={(open) => { if (!open) closeManageMembers(); }}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1E3A8A]" />
              إدارة أعضاء القناة
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {managingChannel?.name} — {channelMembers.length} عضو
            </DialogDescription>
          </DialogHeader>

          {membersLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-6 h-6 text-[#1E3A8A] animate-spin" />
              <p className="text-sm text-gray-400">جاري تحميل الأعضاء...</p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              {/* Current members */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  الأعضاء الحاليون ({channelMembers.length})
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100">
                  {channelMembers.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">لا يوجد أعضاء في هذه القناة</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {channelMembers.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#1E3A8A]/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {member.user?.name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{member.user?.name || 'مستخدم'}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] text-gray-400 truncate">{member.user?.email || ''}</p>
                                <Badge
                                  className={
                                    member.role === 'مسؤول'
                                      ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20 text-[10px] px-1.5 py-0'
                                      : member.role === 'مشرف'
                                        ? 'bg-purple-50 text-purple-600 border-purple-200 text-[10px] px-1.5 py-0'
                                        : 'bg-gray-100 text-gray-500 border-gray-200 text-[10px] px-1.5 py-0'
                                  }
                                  variant="outline"
                                >
                                  {member.role || member.user?.role || 'عضو'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className={`w-2 h-2 rounded-full ${
                              member.user?.status === 'متصل' ? 'bg-emerald-500' :
                              member.user?.status === 'متاح' ? 'bg-amber-500' : 'bg-gray-300'
                            }`} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveMember(member.userId)}
                              title="إزالة العضو"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add new members */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  إضافة أعضاء جدد
                </h4>
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="بحث عن مستخدم بالاسم أو البريد..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="pr-9 h-9 text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100">
                  {availableUsers.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      {users.length === 0 ? 'لا يوجد مستخدمون متاحون' : 'جميع المستخدمين أعضاء بالفعل أو لا توجد نتائج'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {availableUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {user.name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              className={
                                user.role === 'مسؤول'
                                  ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20 text-[10px] px-1.5 py-0'
                                  : user.role === 'مشرف'
                                    ? 'bg-purple-50 text-purple-600 border-purple-200 text-[10px] px-1.5 py-0'
                                    : 'bg-gray-100 text-gray-500 border-gray-200 text-[10px] px-1.5 py-0'
                              }
                              variant="outline"
                            >
                              {user.role}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleAddMember(user.id)}
                              title="إضافة إلى القناة"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              className="text-sm h-9"
              onClick={closeManageMembers}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatCard sub-component                                             */
/* ------------------------------------------------------------------ */

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
          <p className="text-[11px] text-gray-400 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
