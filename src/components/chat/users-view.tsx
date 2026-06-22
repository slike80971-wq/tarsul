'use client';

import { useState, useEffect } from 'react';
import { Users, Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppState, type User } from '@/components/chat';

const statusColors: Record<string, string> = {
  'متصل': 'bg-emerald-500', 'متاح': 'bg-amber-500', 'غير متصل': 'bg-red-500',
};

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(data => { setUsers(data.users || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col min-w-0" dir="rtl">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900 mb-3">المستخدمين</h1>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="ابحث عن مستخدم..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 pr-9 pl-4 bg-gray-50 border-gray-200 rounded-lg text-sm" dir="rtl" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map((i) => (<div key={i} className="bg-gray-100 rounded-xl h-16 animate-pulse" />))}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400"><Users className="w-12 h-12 mb-2 opacity-50" /><p className="text-sm">لا يوجد مستخدمون</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((user) => (
              <div key={user.id} className="bg-white rounded-xl p-3 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">{user.name.charAt(0)}</div>
                  <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[user.status]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${user.role === 'مسؤول' ? 'border-purple-200 text-purple-600 bg-purple-50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>{user.role}</Badge>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-blue-50"><UserPlus className="w-4 h-4 text-[#1E3A8A]" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
