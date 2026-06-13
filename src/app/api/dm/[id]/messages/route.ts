/**
 * GET /api/dm/[id]/messages - Get messages for a DM
 * POST /api/dm/[id]/messages - Send a DM (E2E encrypted)
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
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50');

    const dm = await db.directMessage.findUnique({ where: { id } });
    if (!dm || (dm.user1Id !== auth.user!.id && dm.user2Id !== auth.user!.id)) {
      return NextResponse.json({ error: 'المحادثة غير موجودة' }, { status: 404 });
    }

    const messages = await db.message.findMany({
      where: { dmId: id, isDeleted: false },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true },
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

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error('Get DM messages error:', error);
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
    const { content, iv, type, replyToId } = body;

    if (!content) {
      return NextResponse.json({ error: 'محتوى الرسالة مطلوب' }, { status: 400 });
    }

    const dm = await db.directMessage.findUnique({ where: { id } });
    if (!dm || (dm.user1Id !== auth.user!.id && dm.user2Id !== auth.user!.id)) {
      return NextResponse.json({ error: 'المحادثة غير موجودة' }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        content,
        iv: iv || null,
        senderId: auth.user!.id,
        dmId: id,
        type: type || 'encrypted',
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true },
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

    await db.directMessage.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    console.error('Send DM error:', error);
    return NextResponse.json({ error: 'خطأ في إرسال الرسالة' }, { status: 500 });
  }
}