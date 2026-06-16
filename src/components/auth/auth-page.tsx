/**
 * Tarsul - تراسل | Login / Registration Page
 * Enterprise chat platform authentication with E2EE support.
 * Features: animated background, password strength indicator, remember me,
 * shake animation on error, connection status indicator.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { CryptoManager } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Lock, Mail, User, Building2, Eye, EyeOff, Loader2, KeyRound, MessageCircle, Wifi, WifiOff } from 'lucide-react';

// Password strength calculator
function getPasswordStrength(pw: string): { score: number; label: string; color: string; width: string } {
  if (!pw) return { score: 0, label: '', color: '', width: 'w-0' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: 'ضعيفة', color: 'bg-red-500', width: 'w-1/3' };
  if (score <= 4) return { score, label: 'متوسطة', color: 'bg-amber-500', width: 'w-2/3' };
  return { score, label: 'قوية', color: 'bg-emerald-500', width: 'w-full' };
}

export default function AuthPage() {
  const { setUser, setLoading, isLoading, loginError, setLoginError } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Seed the database on mount
  useEffect(() => {
    fetch('/api/seed', { method: 'POST' })
      .then(() => setSeedDone(true))
      .catch(() => setSeedDone(true));
  }, []);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = useAuthStore.getState().token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/auth/me', { method: 'GET', headers });
        if (res.ok || res.status === 401) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch {
        setConnectionStatus('disconnected');
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'خطأ في تسجيل الدخول');
        return;
      }

      // Initialize E2EE crypto
      const cryptoManager = CryptoManager.getInstance();
      const { publicKeyPEM } = await cryptoManager.initialize();

      // Upload public key to server
      await fetch(`/api/users/${data.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ publicKey: publicKeyPEM }),
      });

      // Update user status to online
      setUser({ ...data.user, status: 'online' }, data.token);
    } catch {
      setLoginError('خطأ في الاتصال بالخادم');
      
      setConnectionStatus('disconnected');
    }
  };

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password) return;

    if (password.length < 8) {
      setLoginError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, department: department || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'خطأ في التسجيل');
        return;
      }

      // Initialize E2EE crypto
      const cryptoManager = CryptoManager.getInstance();
      const { publicKeyPEM } = await cryptoManager.initialize();

      // Upload public key to server
      await fetch(`/api/users/${data.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ publicKey: publicKeyPEM }),
      });

      setUser({ ...data.user, status: 'online' }, data.token);
    } catch {
      setLoginError('خطأ في الاتصال بالخادم');
      
      setConnectionStatus('disconnected');
    }
  }, [email, name, password, department, setLoading, setLoginError, setUser]);

  const pwStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center auth-pattern p-4" dir="rtl">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-800/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-200/40 dark:bg-teal-800/20 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite_1s]" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full blur-3xl animate-[float_7s_ease-in-out_infinite_2s]" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-teal-100/30 dark:bg-teal-900/10 rounded-full blur-3xl animate-[float_5s_ease-in-out_infinite_0.5s]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Connection status */}
        <div className="flex justify-center mb-4">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : connectionStatus === 'disconnected'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}>
            {connectionStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
            {connectionStatus === 'connected' && <Wifi className="w-3 h-3" />}
            {connectionStatus === 'disconnected' && <WifiOff className="w-3 h-3" />}
            {connectionStatus === 'checking' ? 'جاري التحقق...' : connectionStatus === 'connected' ? 'متصل بالخادم' : 'غير متصل'}
          </div>
        </div>

        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/10 mb-4 animate-float">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">تراسل</h1>
          <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm mt-1">Tarsul — Enterprise Encrypted Messaging</p>
          <p className="text-muted-foreground text-xs mt-2">منصة مراسلة داخلية مشفرة للمؤسسات والمصارف</p>
        </div>

        {/* Auth Card */}
        <Card className={`border-0 shadow-xl shadow-black/5 dark:shadow-black/20 bg-card/80 backdrop-blur-sm ${loginError ? 'animate-shake' : ''}`}>
          <Tabs defaultValue="login" onValueChange={(v) => { setIsLogin(v === 'login'); setLoginError(null); }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <CardDescription className="text-sm text-muted-foreground">
                  <KeyRound className="w-4 h-4 inline ml-1" />
                  تشفير شامل من الطرف إلى الطرف (E2EE)
                </CardDescription>
              </div>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">حساب جديد</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* Error Alert */}
              {loginError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
                  {loginError}
                </div>
              )}

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
                      <Mail className="w-4 h-4 inline ml-1" />
                      البريد الإلكتروني المؤسسي
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="admin@tarsul.ly"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      dir="ltr"
                      className="text-left h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
                      <Lock className="w-4 h-4 inline ml-1" />
                      كلمة المرور
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(v) => setRememberMe(v === true)}
                      className="border-emerald-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                      تذكرني
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 ml-2" />
                        دخول آمن
                      </>
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 p-3 bg-muted rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground text-center mb-2">حسابات تجريبية للعرض التوضيحي</p>
                  <div className="space-y-1 text-xs text-muted-foreground" dir="ltr">
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">Admin:</span>
                      <span>admin@tarsul.ly / Admin@123</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">User:</span>
                      <span>ahmed@bank.ly / User@123</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-sm font-medium text-foreground">
                      <User className="w-4 h-4 inline ml-1" />
                      الاسم الكامل
                    </Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="محمد أحمد"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-medium text-foreground">
                      <Mail className="w-4 h-4 inline ml-1" />
                      البريد الإلكتروني المؤسسي
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="name@bank.ly"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      dir="ltr"
                      className="text-left h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-dept" className="text-sm font-medium text-foreground">
                      <Building2 className="w-4 h-4 inline ml-1" />
                      القسم / الإدارة
                    </Label>
                    <Input
                      id="reg-dept"
                      type="text"
                      placeholder="تقنية المعلومات"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium text-foreground">
                      <Lock className="w-4 h-4 inline ml-1" />
                      كلمة المرور (8 أحرف على الأقل)
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {password.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.color} ${pwStrength.width}`} />
                        </div>
                        <p className={`text-[11px] font-medium ${
                          pwStrength.score <= 2 ? 'text-red-500' : pwStrength.score <= 4 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {pwStrength.label}
                          {pwStrength.score <= 4 && pwStrength.score > 0 && ' — أضف أحرفاً خاصة وأرقاماً'}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium transition-all duration-200"
                    disabled={isLoading || pwStrength.score < 3}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 ml-2" />
                        إنشاء حساب مشفر
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-muted-foreground">
            🔒 جميع الرسائل مشفرة من الطرف إلى الطرف باستخدام AES-256-GCM + RSA-OAEP
          </p>
          <p className="text-xs text-muted-foreground">
            © 2025 تراسل — Tarsul Enterprise Messaging Platform v1.0
          </p>
        </div>
      </div>
    </div>
  );
}