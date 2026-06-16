/**
 * GET /api/auth/me
 * Get current authenticated user info.
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ error: 'جلسة منتهية الصلاحية' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, email: true, name: true, avatar: true,
        role: true, department: true, status: true,
        publicKey: true, lastSeen: true, createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'خطأ في المصادقة' }, { status: 500 });
  }
}