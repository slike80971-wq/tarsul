import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/admin/approvals - Get pending approval users
export async function GET() {
  try {
    const users = await db.user.findMany({
      where: { approvalStatus: 'pending' },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        role: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب طلبات الموافقة' }, { status: 500 });
  }
}