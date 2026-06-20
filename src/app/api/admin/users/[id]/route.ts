import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/admin/users/[id] - Delete or block/unblock user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json();

    if (action === 'block') {
      const user = await db.user.update({
        where: { id },
        data: { isBlocked: true, status: 'غير متصل' },
      });
      return NextResponse.json({ user });
    }

    if (action === 'unblock') {
      const user = await db.user.update({
        where: { id },
        data: { isBlocked: false },
      });
      return NextResponse.json({ user });
    }

    if (action === 'delete') {
      await db.user.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء تنفيذ الإجراء' }, { status: 500 });
  }
}
