/**
 * POST /api/channels/[id]/messages/[messageId]/pin - Toggle pin/unpin a message
 * DELETE /api/channels/[id]/messages/[messageId] - Soft-delete a message
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

// Pin / unpin a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id, messageId } = await params;

    // Verify user is a channel member
    const membership = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: auth.user!.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'غير عضو في هذه القناة' }, { status: 403 });
    }

    // Find the message
    const message = await db.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.channelId !== id) {
      return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 });
    }

    // Toggle pin
    const updated = await db.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true, department: true },
        },
      },
    });

    return NextResponse.json({ message: updated });
  } catch (error: unknown) {
    console.error('Pin message error:', error);
    return NextResponse.json({ error: 'خطأ في تثبيت الرسالة' }, { status: 500 });
  }
}

// Soft-delete a message (own messages or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id, messageId } = await params;

    // Verify user is a channel member
    const membership = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: auth.user!.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'غير عضو في هذه القناة' }, { status: 403 });
    }

    // Find the message
    const message = await db.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.channelId !== id) {
      return NextResponse.json({ error: 'الرسالة غير موجودة' }, { status: 404 });
    }

    // Only the sender or admin/manager can delete
    const canDelete =
      message.senderId === auth.user!.id ||
      auth.user!.role === 'admin' ||
      auth.user!.role === 'manager';

    if (!canDelete) {
      return NextResponse.json({ error: 'غير مصرح بحذف هذه الرسالة' }, { status: 403 });
    }

    // Soft delete
    const updated = await db.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: 'تم حذف هذه الرسالة',
        iv: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'خطأ في حذف الرسالة' }, { status: 500 });
  }
}