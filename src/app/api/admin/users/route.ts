import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/users - Get all users with full details
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true, email: true, name: true, avatar: true, status: true,
        role: true, approvalStatus: true, isBlocked: true, timezone: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب المستخدمين' }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, timezone } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مسجل بالفعل' }, { status: 400 });
    }
    const user = await db.user.create({
      data: {
        email, password, name,
        role: role || 'مستخدم',
        timezone: timezone || 'Asia/Riyadh',
        approvalStatus: 'approved',
        status: 'متصل',
      },
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء المستخدم' }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update user (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const { id, name, email, role, status, password, timezone } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }
    const data: Record<string, string> = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (status) data.status = status;
    if (password) data.password = password;
    if (timezone) data.timezone = timezone;

    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث المستخدم' }, { status: 500 });
  }
}
