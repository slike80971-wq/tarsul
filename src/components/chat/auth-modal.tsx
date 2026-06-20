'use client';

import { useState } from 'react';
import { X, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppState, setState, type User } from '@/components/chat';

interface InitialUsers {
  users: User[];
}

export function AuthModal({ initialUsers }: { initialUsers?: InitialUsers }) {
  const showAuthModal = useAppState(s => s.showAuthModal);
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (initialUsers?.users) {
      const user = initialUsers.users.find(u => u.email === email);
      if (user) {
        if (user.isBlocked) {
          setError('تم حظر هذا الحساب. تواصل مع المسؤول.');
          setLoading(false);
          return;
        }
        if (user.approvalStatus === 'pending') {
          setError('حسابك قيد المراجعة. انتظر موافقة المسؤول.');
          setLoading(false);
          return;
        }
        if (user.approvalStatus === 'rejected') {
          setError('تم رفض طلب التسجيل. تواصل مع المسؤول.');
          setLoading(false);
          return;
        }
        setState({ currentUser: user, isAuthenticated: true, showAuthModal: false });
        localStorage.setItem('chat-user', JSON.stringify(user));
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
        return;
      }
      setState({ currentUser: data.user, isAuthenticated: true, showAuthModal: false });
      localStorage.setItem('chat-user', JSON.stringify(data.user));
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, timezone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(data.message || 'تم تسجيل طلبك بنجاح. انتظر موافقة المسؤول.');
      setEmail('');
      setPassword('');
      setName('');
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (activeTab === 'login') handleLogin();
    else handleRegister();
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => setState({ showAuthModal: open })}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-xl border-0 [&>button]:hidden">
        <div className="bg-[#1E3A8A] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setState({ showAuthModal: false })} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <DialogTitle className="text-white text-lg font-bold">
                {activeTab === 'login' ? 'تسجيل الدخول' : 'تسجيل جديد'}
              </DialogTitle>
              <p className="text-white/70 text-xs mt-0.5">
                {activeTab === 'login' ? 'استخدم حسابك للدخول إلى التطبيق' : 'أنشئ حساباً جديداً للانضمام'}
              </p>
            </div>
          </div>
          <div className="bg-emerald-500 p-2 rounded-full">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="px-6 pt-4">
          <div className="flex gap-4 border-b border-gray-200">
            <button onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }} className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'login' ? 'text-gray-900 border-b-2 border-[#1E3A8A]' : 'text-gray-400 hover:text-gray-600'}`}>
              تسجيل الدخول
            </button>
            <button onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }} className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'register' ? 'text-gray-900 border-b-2 border-[#1E3A8A]' : 'text-gray-400 hover:text-gray-600'}`}>
              تسجيل جديد
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            {error}
          </div>}
          {success && <div className="bg-emerald-50 text-emerald-600 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>}
          {activeTab === 'register' && (
            <Input placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-right bg-gray-50 border-gray-200 rounded-lg" dir="rtl" />
          )}
          <Input placeholder="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-right bg-gray-50 border-gray-200 rounded-lg" dir="rtl" />
          <Input placeholder="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-right bg-gray-50 border-gray-200 rounded-lg" dir="rtl" />
          {activeTab === 'login' && (
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full h-11 text-right bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-600" dir="rtl">
              <option value="Asia/Riyadh">المنطقة الزمنية - الرياض</option>
              <option value="Asia/Dubai">المنطقة الزمنية - دبي</option>
              <option value="Africa/Cairo">المنطقة الزمنية - القاهرة</option>
              <option value="Europe/London">المنطقة الزمنية - لندن</option>
            </select>
          )}
          <Button onClick={handleSubmit} disabled={loading || !email || !password || (activeTab === 'register' && !name)} className="w-full h-11 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white rounded-lg font-medium">
            {loading ? 'جاري التحميل...' : activeTab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-2">
            {activeTab === 'login'
              ? 'للتجربة: admin@example.com / admin123 (أدمن) أو ahmed@example.com'
              : 'التسجيلات الجديدة تحتاج موافقة المسؤول'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
