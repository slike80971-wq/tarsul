/**
 * GET /api/channels/[id]/messages - Get messages for a channel
 * POST /api/channels/[id]/messages - Send a message to a channel
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const before = url.searchParams.get('before');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Verify user is a channel member
    const membership = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: auth.user!.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'غير عضو في هذه القناة' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      channelId: id,
      isDeleted: false,
    };

    if (before) {
      (where as { createdAt: { lt: Date } }).createdAt = { lt: new Date(before) };
    }

    const messages = await db.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true, department: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    // Update last read
    await db.channelMember.update({
      where: { id: membership.id },
      data: { lastRead: new Date() },
    });

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'خطأ في جلب الرسائل' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, iv, type, replyToId, metadata } = body;

    if (!content) {
      return NextResponse.json({ error: 'محتوى الرسالة مطلوب' }, { status: 400 });
    }

    const membership = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId: auth.user!.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'غير عضو في هذه القناة' }, { status: 403 });
    }

    const message = await db.message.create({
      data: {
        content,
        iv: iv || null,
        senderId: auth.user!.id,
        channelId: id,
        type: type || 'encrypted',
        replyToId: replyToId || null,
        metadata: metadata || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true, department: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    await db.channel.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'خطأ في إرسال الرسالة' }, { status: 500 });
  }
}