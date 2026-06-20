import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users - Get all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, avatar: true, status: true, role: true, createdAt: true },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب المستخدمين' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    const user = await db.user.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث الحالة' }, { status: 500 });
  }
}
