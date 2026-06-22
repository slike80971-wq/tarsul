# تطبيق الدردشة - Z.ai Chat

تطبيق مراسلة ديناميكي مع قاعدة بيانات ديناميكية

## المتطلبات

- Node.js 18+ أو Bun
- حساب على [Neon](https://console.neon.tech/) لقاعدة البيانات
- حساب على [Vercel](https://vercel.com/) للنشر (اختياري)

## الإعداد

### 1. تثبيت التبعيات

```bash
# باستخدام npm
npm install

# أو باستخدام bun
bun install
```

### 2. إعداد قاعدة البيانات

1. أنشئ مشروعاً جديداً على [Neon Console](https://console.neon.tech/)
2. احصل على رابط الاتصال بقاعدة البيانات (DATABASE_URL)
3. أنشئ ملف `.env` في المجلد الرئيسي:

```bash
cp .env.example .env
```

4. عدّل ملف `.env` وأضف رابط قاعدة البيانات:

```env
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_SOCKET_URL="/?XTransformPort=3003"
NODE_ENV="development"
```

### 3. إنشاء قاعدة البيانات

```bash
# توليد Prisma Client
npm run db:generate

# دفع المخطط إلى قاعدة البيانات
npm run db:push

# أو إنشاء الترحيلات
npm run db:migrate
```

### 4. تشغيل المشروع

```bash
# وضع التطوير
npm run dev

# أو باستخدام bun
bun run dev
```

افتح المتصفح على [http://localhost:3000](http://localhost:3000)

## النشر على Vercel

### 1. ربط المستودع

1. ارفع المشروع إلى GitHub
2. في [Vercel Dashboard](https://vercel.com/)، أنشئ مشروع جديد
3. اربط مستودع GitHub

### 2. إضافة متغيرات البيئة

في إعدادات Vercel، أضف المتغيرات التالية:

- `DATABASE_URL`: رابط قاعدة بيانات Neon
- `NEXTAUTH_URL`: رابط النشر (مثلاً: `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET`: مفتاح سري عشوائي
- `NEXT_PUBLIC_SOCKET_URL`: رابط Socket.io (اختياري)

### 3. النشر

Vercel سينشر المشروع تلقائياً عند كل دفع إلى GitHub.

## السكريبتات المتاحة

```bash
npm run dev          # تشغيل وضع التطوير
npm run build        # بناء المشروع للإنتاج
npm run start        # تشغيل وضع الإنتاج
npm run lint         # فحص الكود باستخدام ESLint
npm run db:generate  # توليد Prisma Client
npm run db:push      # دفع المخطط إلى قاعدة البيانات
npm run db:migrate   # إنشاء الترحيلات
npm run db:reset     # إعادة تعيين قاعدة البيانات
npm run db:seed      # إضافة بيانات تجريبية
```

## هيكل المشروع

```
src/
├── app/              # صفحات Next.js
│   ├── api/         # API Routes
│   ├── layout.tsx   # التخطيط الرئيسي
│   └── page.tsx     # الصفحة الرئيسية
├── components/       # مكونات React
│   ├── chat/        # مكونات الدردشة
│   └── ui/          # مكونات UI
├── lib/             # مكتبات مساعدة
│   ├── db.ts        # اتصال Prisma
│   ├── socket.ts    # Socket.io client
│   └── utils.ts     # وظائف مساعدة
└── hooks/           # React Hooks
```

## الميزات

- محادثات خاصة وجماعية
- قنوات (Channels)
- مكالمات صوتية
- رفع الملفات
- لوحة تحكم للمسؤول
- نظام موافقة المستخدمين
- إحصائيات شاملة

## الدعم

للدعم والاستفسارات، تواصل مع فريق Z.ai.
