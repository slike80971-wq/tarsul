import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/approvals - Get pending users
export async function GET() {
  try {
    const users = await db.user.findMany({
      where: { approvalStatus: 'pending' },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST /api/admin/approvals/[id] - Approve or reject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json();

    if (action === 'approve') {
      const user = await db.user.update({
        where: { id },
        data: { approvalStatus: 'approved', status: 'متصل' },
      });
      return NextResponse.json({ user });
    }

    if (action === 'reject') {
      const user = await db.user.update({
        where: { id },
        data: { approvalStatus: 'rejected' },
      });
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
