import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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