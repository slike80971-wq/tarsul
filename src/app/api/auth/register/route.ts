import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, timezone } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبان' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل' }, { status: 400 });
    }

    const user = await db.user.create({
      data: {
        email, password, name,
        timezone: timezone || 'Asia/Riyadh',
        status: 'غير متصل',
        approvalStatus: 'pending', // New users need admin approval
      },
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, status: user.status, role: user.role },
      pending: true,
      message: 'تم تسجيل طلبك بنجاح. انتظر موافقة المسؤول.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء التسجيل' }, { status: 500 });
  }
}
