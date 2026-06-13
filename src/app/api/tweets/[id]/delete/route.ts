/**
 * DELETE /api/tweets/[id] - Soft delete a tweet (own tweets only, or admin)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;

    const tweet = await db.tweet.findUnique({ where: { id } });
    if (!tweet || tweet.isDeleted) {
      return NextResponse.json({ error: 'التغريدة غير موجودة' }, { status: 404 });
    }

    // Only sender or admin can delete
    if (tweet.senderId !== auth.user!.id && auth.user!.role !== 'admin') {
      return NextResponse.json({ error: 'غير مصرح بحذف هذه التغريدة' }, { status: 403 });
    }

    await db.tweet.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete tweet error:', error);
    return NextResponse.json({ error: 'خطأ في حذف التغريدة' }, { status: 500 });
  }
}