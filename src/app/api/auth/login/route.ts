import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json({ error: 'تم حظر هذا الحساب. تواصل مع المسؤول.', blocked: true }, { status: 403 });
    }

    // Check if user is approved
    if (user.approvalStatus === 'pending') {
      return NextResponse.json({ error: 'حسابك قيد المراجعة. انتظر موافقة المسؤول.', pending: true }, { status: 403 });
    }

    if (user.approvalStatus === 'rejected') {
      return NextResponse.json({ error: 'تم رفض طلب التسجيل. تواصل مع المسؤول.', rejected: true }, { status: 403 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { status: 'متصل' },
    });

    return NextResponse.json({
      user: {
        id: user.id, email: user.email, name: user.name, avatar: user.avatar,
        status: user.status, role: user.role, timezone: user.timezone,
        approvalStatus: user.approvalStatus, isBlocked: user.isBlocked,
      },
    });
  }  catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "حدث خطأ أثناء تسجيل الدخول",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
